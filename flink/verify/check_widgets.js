// Checks the recorded tables that the Apache Flink labs and lessons read, with arithmetic and rules written here, in code that shares nothing with the widgets: slot sharing and chaining, the
// changelog of a streaming aggregate, the watermark and the late orders, the four kinds of window, a checkpoint with a crash and a replay, the size of the state of a join, the murmur hash
// that puts a key in a key group, deduplication, the Kafka topic that an upsert sink writes, and the arithmetic of backpressure.
// The widgets themselves are driven in the browser by flink/verify/e2e_labs.js, which compares what they show with values worked out by hand.
// Run: node flink/verify/check_widgets.js        FLINK_REAL_JS=<file> lets verify_fl.py feed it a broken copy of the recording
const fs = require('fs'), path = require('path');
global.window = global; global.LAB = {};
const root = path.join(__dirname, '..', '..');
(0, eval)(fs.readFileSync(process.env.FLINK_REAL_JS || path.join(root, 'flink', 'js', 'real.js'), 'utf8'));
const R = LAB.real, C = k => R.counts[k], T = k => R.tables[k], X = k => R.text[k];
let checks = 0, fails = 0;
const eq = (got, want, what) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) { fails++; console.log('FAIL:', what, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };
const near = (got, want, what, tol) => { checks++; if (!(Math.abs(got - want) <= (tol === undefined ? 1e-9 : tol))) { fails++; console.log('FAIL:', what, 'got', got, 'want', want, 'tolerance', tol); } };
const yes = (cond, what) => { checks++; if (!cond) { fails++; console.log('FAIL:', what); } };
const sum = a => a.reduce((x, y) => x + y, 0);
const str = rows => rows.map(r => r.map(String));
const STORES = ['s01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10', 's11', 's12'];

// ---- The cluster that was run ----------------------------------------------------------------------------------------------------------------------------------
const M = R.meta;
eq(M.flink, '2.2.1', 'Apache Flink 2.2.1'); eq(M.company, 'Brewline', 'the made-up company'); eq(M.kafka, '4.4.0', 'Apache Kafka 4.4.0'); eq(M['kafka-connector'], '5.0.0-2.2', 'the Kafka connector for Flink 2.2');
eq(M['flink-cdc'], '3.7.0-2.2', 'the Flink CDC connector for Flink 2.2'); yes(/^16\./.test(M.postgresql), 'PostgreSQL 16');
const CL = C('world.cluster');
eq([CL.taskmanagers, CL.slots_per_taskmanager, CL.slots_total], [2, 2, 4], 'two TaskManagers of two slots make four slots'); eq(CL.slots_total, CL.taskmanagers * CL.slots_per_taskmanager, 'the slots add up');
eq(CL.version, M.flink, 'the cluster reports the version of the recording'); yes(CL.heartbeat_timeout_ms > CL.heartbeat_interval_ms, 'the heartbeat timeout is longer than the interval');
const PR = T('world.processes'); eq(PR.rows.filter(r => r[0] === 'JobManager').length, 1, 'one JobManager'); eq(PR.rows.filter(r => r[0] === 'TaskManager').length, CL.taskmanagers, 'one process for every TaskManager');
PR.rows.forEach(r => yes(r[2] < (r[0] === 'JobManager' ? CL.jobmanager_process_mib : CL.taskmanager_process_mib), 'the heap of the ' + r[0] + ' is smaller than its process'));
const MEM = {}; T('world.taskmanager_memory').rows.forEach(r => { MEM[r[0]] = r[1]; }); const MS = C('world.taskmanager_memory_sums');
const pieces = ['Framework heap', 'Task heap', 'Framework off-heap', 'Task off-heap', 'Network buffers', 'Managed memory', 'JVM metaspace', 'JVM overhead'];
eq(sum(pieces.map(p => MEM[p])), MEM['Total process'], 'the pieces of the memory add up to the process size'); eq(MEM['Total process'], CL.taskmanager_process_mib, 'the process size is the configured one');
eq(MS.total_flink_mib, MEM['Total process'] - MEM['JVM metaspace'] - MEM['JVM overhead'], 'total Flink memory is the process without metaspace and overhead');
near(MEM['Managed memory'], 0.4 * MS.total_flink_mib, 'managed memory is 0.4 of the Flink memory', 1); near(MEM['Network buffers'], 0.1 * MS.total_flink_mib, 'network memory is 0.1 of the Flink memory', 1);

// ---- Lab 1: parallelism, chaining and slots --------------------------------------------------------------------------------------------------------------------
// slot sharing: a slot holds one task of every vertex, so a job needs the slots of its highest parallelism; a job that needs more slots than the cluster has cannot start
const verticesOf = chained => chained ? 2 : 6;
T('world.slots').rows.forEach(r => {
  const p = r[0], tasks = verticesOf(true) * p, fits = p <= CL.slots_total;
  eq(r[1], tasks, 'parallelism ' + p + ': two vertices make ' + tasks + ' tasks'); eq(r[3], fits ? 'RUNNING' : 'FAILED', 'parallelism ' + p + (fits ? ' starts' : ' does not start'));
  eq(r[2], fits ? p : 0, 'parallelism ' + p + (fits ? ' uses ' + p + ' slots' : ' uses none')); if (!fits) yes(/NoResourceAvailableException/.test(r[4]), 'the error of parallelism ' + p + ' names the missing resources'); else eq(r[4], '', 'no error when the job starts');
});
eq(T('world.slots').rows.map(r => r[0]), [1, 2, 4, 5], 'the parallelisms that were run');
const CH = T('world.chaining').rows; eq([CH[0][1], CH[0][2]], [verticesOf(true), verticesOf(true) * 2], 'chaining on: two vertices, four tasks at parallelism 2'); eq([CH[1][1], CH[1][2]], [verticesOf(false), verticesOf(false) * 2], 'chaining off: six vertices, twelve tasks');
eq(CH[0][3].split(' | ').length, 2, 'the names of the two chained vertices'); eq(CH[1][3].split(' | ').length, 6, 'the names of the six vertices');
const PL = T('world.plan').rows; eq(PL.length, 2, 'two vertices in the plan'); eq(PL[1][3], 'HASH', 'the aggregation is fed by a hash'); eq(PL[0][3], 'nothing: a source', 'the source has no input'); eq(PL.map(r => r[2]), [2, 2], 'both vertices have parallelism 2');
const J = C('world.job'); eq([J.vertices, J.tasks, J.slots_used], [2, 4, 2], 'the plan job: 2 vertices, 4 tasks, 2 slots');
const plan = JSON.parse(X('world.plan_json')).plan; eq(plan.nodes.length, 2, 'two nodes in the REST plan'); eq(plan.nodes.filter(n => n.inputs).length, 1, 'one node has an input'); eq(plan.nodes.find(n => n.inputs).inputs[0].ship_strategy, 'HASH', 'the REST plan says HASH');
yes(/Exchange\(distribution=\[hash\[store_id\]\]\)/.test(X('world.explain')), 'EXPLAIN shows the hash exchange on the store');
eq(plan.nodes.slice().sort((a, b) => a.id < b.id ? -1 : 1).map(n => n.description.split('\n').filter(l => /^\s*[+\- ]*\[\d+\]/.test(l)).length), [2, 4], 'operators chained in each vertex: 2 and 4');

// ---- Lab 2: the changelog of a streaming query -----------------------------------------------------------------------------------------------------------------
const ORD = T('sql.orders').rows;                                    // order_id, store_id, customer_id, total_cents, status, channel
const fmt = (op, ...cells) => [op].concat(cells.map(String));
function aggregate(orders) {                                          // GROUP BY store: count and sum, one change per input row
  const st = new Map(), out = [];
  for (const o of orders) {
    const k = o[1], cur = st.get(k);
    if (!cur) { st.set(k, [1, o[3]]); out.push(fmt('+I', k, 1, o[3])); }
    else { out.push(fmt('-U', k, cur[0], cur[1])); cur[0] += 1; cur[1] += o[3]; out.push(fmt('+U', k, cur[0], cur[1])); }
  }
  return out;
}
function countOfCounts(changes) {                                     // GROUP BY n over the result above: an empty group is deleted
  const groups = new Map(), out = [];
  const add = n => { const c = groups.get(n); if (!c) { groups.set(n, 1); out.push(fmt('+I', n, 1)); } else { out.push(fmt('-U', n, c)); groups.set(n, c + 1); out.push(fmt('+U', n, c + 1)); } };
  const del = n => { const c = groups.get(n); if (c === 1) { groups.delete(n); out.push(fmt('-D', n, 1)); } else { out.push(fmt('-U', n, c)); groups.set(n, c - 1); out.push(fmt('+U', n, c - 1)); } };
  changes.forEach(c => { const n = Number(c[2]); if (c[0] === '+I' || c[0] === '+U') add(n); else del(n); });
  return out;
}
const apply = (changes, keyCols) => { const tab = new Map(); for (const c of changes) { const key = c.slice(1, 1 + keyCols).join('|'); if (c[0] === '+I' || c[0] === '+U') tab.set(key, c.slice(1)); else tab.delete(key); } return [...tab.values()]; };
const L1 = aggregate(ORD), L2 = countOfCounts(L1);
eq(str(T('sql.stream_group').rows), L1, 'the count and sum for each store: the changes that Flink printed are the ones the rule gives');
eq(str(T('sql.two_level').rows), L2, 'the count of counts: the changes that Flink printed are the ones the rule gives');
const cnt = ch => { const o = {}; ch.forEach(c => { o[c[0]] = (o[c[0]] || 0) + 1; }); return Object.keys(o).sort().reduce((x, k) => (x[k] = o[k], x), {}); };
const sortKeys = o => Object.keys(o).sort().reduce((x, k) => (x[k] = o[k], x), {});
eq(sortKeys(C('sql.stream_summary').ops), cnt(L1), 'the kinds of change of the first query'); eq(sortKeys(C('sql.two_level_summary').ops), cnt(L2), 'the kinds of change of the second query');
eq([C('sql.stream_summary').changelog_rows, C('sql.two_level_summary').changelog_rows], [L1.length, L2.length], 'the number of changes');
const finalRows = apply(L1, 1).map(r => r.map(String)).sort(); eq(finalRows, str(T('sql.batch_group').rows).slice().sort(), 'replaying the changelog gives the batch result');
eq(C('sql.two_level_summary').replay, C('sql.two_level_summary').batch, 'the count of counts ends as its batch result'); eq(apply(L2, 1).map(r => r.map(String)).sort(), str(C('sql.two_level_summary').batch).sort(), 'replaying the second changelog gives the batch result');
const stores = new Set(ORD.map(r => r[1])); eq([C('sql.stream_summary').stores, T('sql.batch_group').rows.length], [stores.size, stores.size], 'seven stores in twelve orders');
eq(C('sql.stream_summary').ops['+I'], stores.size, 'one insert for each store'); eq(C('sql.stream_summary').ops['-U'], ORD.length - stores.size, 'every other order sends a retraction');
const batchByStore = {}; ORD.forEach(o => { const b = batchByStore[o[1]] || (batchByStore[o[1]] = [0, 0]); b[0]++; b[1] += o[3]; });
eq(str(T('sql.batch_group').rows), Object.keys(batchByStore).sort().map(k => [k, String(batchByStore[k][0]), String(batchByStore[k][1])]), 'the batch result counts and adds up the orders by store');
const refunds = ORD.filter(o => o[4] === 'refunded').map(o => ['+I', String(o[0]), o[1], String(o[3])]); eq(str(T('sql.append_only').rows), refunds, 'the refunds, as the inserts of a query with no aggregate'); eq(C('sql.append_only_summary').rows, refunds.length, 'the number of refunds');
const MB = T('sql.minibatch').rows, MS2 = C('sql.minibatch_summary'); eq(MB.length, MS2.changelog_rows_with, 'the rows of the mini-batch run'); eq(MS2.changelog_rows_without, L1.length, 'the run without mini-batch is the full changelog');
yes(MB.length < L1.length, 'mini-batch sends fewer changes'); eq(apply(MB.map(r => r.map(String)), 1).map(r => r.map(String)).sort(), finalRows, 'the mini-batch run ends in the same table');
eq(MS2.same_final_table, true, 'the recorder compared the final tables');
eq(X('sql.print_out').split('\n').map(l => l.replace(/^(.)(.)\[/, '$1$2|').replace(/\]$/, '').split(/\|/).join(',').replace(/^([+-][IUD]),/, '$1 ')), T('sql.stream_group').rows.map(r => r[0] + ' ' + r.slice(1).join(', ')), 'the print sink wrote the same changes as the client showed');
eq(C('sql.print_summary').lines, L1.length, 'the print sink wrote one line for each change');
const mode = (txt, re) => (txt.split('\n').find(l => re.test(l)) || '').match(/changelogMode=\[([A-Z,]+)\]/);
eq(mode(X('sql.explain_filter'), /^Calc/)[1], 'I', 'a filter sends only inserts'); eq(mode(X('sql.explain_group'), /^GroupAggregate/)[1], 'I,UA', 'one aggregate sends inserts and the new row of an update');
eq(mode(X('sql.explain_two'), /^GroupAggregate\(groupBy=\[n\]/)[1], 'I,UA,D', 'an aggregate of an aggregate can delete'); eq(mode(X('sql.explain_two'), /GroupAggregate\(groupBy=\[store_id\]/)[1], 'I,UB,UA', 'the inner aggregate takes its old rows back');

// ---- The Kafka topic that an upsert sink writes ------------------------------------------------------------------------------------------------------------------
// a changelog becomes records with a key: -U is not written, +I and +U are written as the new row, -D is a record with no value
const UT = T('connect.upsert_topic').rows, US = C('connect.upsert_summary');
const expectTopic = L2.filter(c => c[0] !== '-U').map(c => [Number(c[1]), c[0] === '-D' ? 'null (a tombstone)' : JSON.stringify({ n: Number(c[1]), stores: Number(c[2]) })]);
eq(UT.map(r => [r[1], r[2]]), expectTopic, 'the topic holds the changelog without its retractions'); eq(UT.map(r => r[0]), UT.map((r, i) => i), 'the offsets count up from 0');
eq([US.changelog_rows_of_the_query, US.records_in_the_topic, US.retractions_not_written, US.tombstones], [L2.length, expectTopic.length, L2.filter(c => c[0] === '-U').length, L2.filter(c => c[0] === '-D').length], 'the upsert numbers');
eq(US.changelog_rows_of_the_query - US.retractions_not_written, US.records_in_the_topic, 'changes minus retractions are the records');
// the last record of each key is the answer: replaying the topic gives the final table of the second query
const lastBy = {}; UT.forEach(r => { if (r[2].startsWith('null')) delete lastBy[r[1]]; else lastBy[r[1]] = JSON.parse(r[2]); });
eq(Object.keys(lastBy).map(k => [String(lastBy[k].n), String(lastBy[k].stores)]).sort(), str(C('sql.two_level_summary').batch).sort(), 'reading the topic as a table gives the batch result');

// ---- Kafka: where a source starts, and the partition of a key (murmur2, the hash of the Java client) --------------------------------------------------------------
function murmur2(data) {
  const m = 0x5bd1e995, r = 24, len = data.length; let h = (0x9747b28c ^ len) >>> 0, i = 0;
  const mul = (a, b) => Number((BigInt(a) * BigInt(b)) & 0xffffffffn);
  for (let k4 = 0; k4 < (len >> 2); k4++) { let k = (data[i] | (data[i + 1] << 8) | (data[i + 2] << 16) | (data[i + 3] << 24)) >>> 0; k = mul(k, m); k = (k ^ (k >>> r)) >>> 0; k = mul(k, m); h = mul(h, m); h = (h ^ k) >>> 0; i += 4; }
  const rest = len & 3; if (rest === 3) h = (h ^ (data[i + 2] << 16)) >>> 0; if (rest >= 2) h = (h ^ (data[i + 1] << 8)) >>> 0; if (rest >= 1) { h = (h ^ data[i]) >>> 0; h = mul(h, m); }
  h = (h ^ (h >>> 13)) >>> 0; h = mul(h, m); h = (h ^ (h >>> 15)) >>> 0; return h;
}
const kpart = (key, n) => (murmur2(Buffer.from(key)) & 0x7fffffff) % n;
const TP = C('connect.topic'), perPart = [0, 0]; ORD.forEach(o => { perPart[kpart(o[1], 2)]++; });
eq([TP.orders_per_partition['0'], TP.orders_per_partition['1']], perPart, 'murmur2 puts the stores of the twelve orders in the recorded partitions'); eq(TP.orders, ORD.length, 'twelve orders in the topic');
const SM = {}; T('connect.startup_modes').rows.forEach(r => { SM[r[0]] = r[2]; });
eq(SM['earliest-offset'], ORD.length, 'earliest-offset reads every order'); eq(SM['latest-offset'], 0, 'latest-offset reads nothing when nobody writes');
eq(SM['timestamp'], ORD.filter(o => o[0] >= 7).length, 'a start at the time of order 7 reads orders 7 to 12 (one second between orders)');
eq(SM['specific-offsets'], 2 * TP.partitions, 'the second to last record of each partition: two for each of the partitions');
T('connect.metadata').rows.forEach(r => { eq(Number(r[2]), kpart(r[1], 2), 'the metadata partition of order ' + r[0]); eq(r[4], '2026-01-01 00:00:0' + (r[0] - 1) + '.000', 'the timestamp of order ' + r[0]); });
eq(T('connect.metadata').rows.map(r => [Number(r[2]), Number(r[3])]).filter(r => r[0] === 1).map(r => r[1]), [0, 1, 2, 3, 4], 'the offsets of one partition count up from zero');

// ---- Lab 3: the watermark and the late orders ------------------------------------------------------------------------------------------------------------------
const EV = T('time.events').rows.map(r => { const p = r[4].split(':').map(Number); return { n: r[0], id: r[1], store: r[2], cents: r[3], t: p[0] * 3600 + p[1] * 60 + p[2], late: r[5] }; });
eq(EV.map(e => e.n), EV.map((e, i) => i + 1), 'the arrival numbers count up'); eq(EV.map(e => e.id), EV.map(e => e.n), 'order id and arrival number are the same here');
let seen = -Infinity; EV.forEach(e => { eq(e.late, Math.max(0, seen - e.t), 'order ' + e.id + ' is behind the largest time seen so far by the recorded number of seconds'); seen = Math.max(seen, e.t); });
const FILE = X('time.events_file').split('\n').map(l => JSON.parse(l)); eq(FILE.map(r => r.order_id), EV.map(e => e.id), 'the file holds the orders in arrival order'); eq(FILE.map(r => r.total_cents), EV.map(e => e.cents), 'the cents of the file');
function tumble(delay, size) {                                         // late: the watermark before the order had reached the end of its window
  let wm = null; const win = {}, late = [], closedAt = {};
  EV.forEach(e => {
    const s = e.t - (e.t % size);
    if (wm !== null && wm >= s + size) late.push(e.id); else { const w = win[s] || (win[s] = [0, 0]); w[0]++; w[1] += e.cents; }
    wm = wm === null ? e.t - delay : Math.max(wm, e.t - delay);
    if (closedAt[0] === undefined && wm >= size) closedAt[0] = e.n;
  });
  return { win, late, closedAt: closedAt[0] };
}
const DS = T('time.delay_summary').rows, DF = C('time.delay_facts'); eq(DS.map(r => r[0]), DF.delays, 'the five delays');
const secOf = s => { const m = s.match(/(\d\d):(\d\d):(\d\d)\.\d+$/); return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]); };
DF.delays.forEach(d => {
  const sim = tumble(d, 60), row = DS.find(r => r[0] === d), tab = T('time.tumble_' + d).rows;
  eq(tab.map(r => [secOf(r[1]), Number(r[3]), Number(r[4])]), Object.keys(sim.win).map(Number).sort((a, b) => a - b).map(s => [s, sim.win[s][0], sim.win[s][1]]), 'delay ' + d + ': windows, counts and cents are the ones that Flink printed');
  eq(row[1], [0, 60, 120, 180, 240].map(s => sim.win[s] ? sim.win[s][0] : 0).join(', '), 'delay ' + d + ': orders in the five windows'); eq(row[2], 14 - sim.late.length, 'delay ' + d + ': orders counted'); eq(row[3], sim.late.length, 'delay ' + d + ': orders dropped');
  eq(row[4], sim.late.join(', '), 'delay ' + d + ': which orders were dropped'); eq(DF.dropped[String(d)], sim.late.length, 'the recorded facts list the dropped orders of delay ' + d);
  eq(tab.every(r => r[0] === '+I'), true, 'delay ' + d + ': a window result is an insert, sent once');
});
// by hand: the first window closes when the largest time seen reaches 60 s plus the delay
eq(DF.delays.map(d => tumble(d, 60).closedAt), [4, 6, 7, 10, undefined], 'order # that closes the first window for each delay: 4, 6, 7, 10 and never');
eq(DF.delays.map(d => tumble(d, 60).late.length), [4, 3, 3, 1, 0], 'dropped orders for the five delays: 4, 3, 3, 1, 0');
yes(DF.delays.every((d, i) => i === 0 || tumble(d, 60).late.length <= tumble(DF.delays[i - 1], 60).late.length), 'a longer delay never drops more orders');
const IW = X('time.idle_without'), II = X('time.idle_with'), IP = X('time.idle_paced'), IS = C('time.idle_summary');
eq(IW, '(nothing was printed)', 'no window without an idle timeout'); eq([C('time.idle_topic').records_in_partition_0, C('time.idle_topic').records_in_partition_1], [14, 0], 'one partition holds the orders, the other is empty');
const idleCounts = txt => txt.split('\n').filter(Boolean).map(l => Number(l.match(/, (\d+)\]$/)[1]));
const burst = tumble(10, 60), burstNoLate = {}; EV.forEach(e => { const s = e.t - (e.t % 60); burstNoLate[s] = (burstNoLate[s] || 0) + 1; });
eq(idleCounts(II), [0, 60, 120, 180].map(s => burstNoLate[s]), 'a Kafka source that read the whole burst before its first timer counts every order of the closed windows');
yes(burst.late.length > 0, 'the same orders had late orders when the watermark followed the data'); eq(IS.windows_with_idle_timeout, idleCounts(II).length, 'windows with the idle timeout');
eq(idleCounts(IP), [0, 60, 120, 180].map(s => tumble(10, 60).win[s][0]), 'orders paced one a second give the counts of the file run');
eq(C('time.idle_paced_summary').first_window_orders, tumble(10, 60).win[0][0], 'the first window of the paced run'); eq(II.split('\n').length, 4, 'four windows closed (the fifth needs a later order)');

// ---- Lab 4: the four kinds of window ----------------------------------------------------------------------------------------------------------------------------
const times = EV.map(e => e.t);
const hop = {}; times.forEach(t => { for (let s = Math.floor(t / 30) * 30 - 30; s <= t; s += 30) if (t >= s && t < s + 60) hop[s] = (hop[s] || 0) + 1; });
eq(T('time.hop').rows.map(r => [secOf(r[1]) - (r[1].startsWith('2025') ? 86400 : 0), Number(r[3])]), Object.keys(hop).map(Number).sort((a, b) => a - b).map(s => [s, hop[s]]), 'hopping windows of 60 s every 30 s hold the orders by rule (the first one starts before 00:00:00)');
eq(sum(T('time.hop').rows.map(r => Number(r[3]))), 2 * EV.length, 'every order is in two hopping windows');
const cum = {}; times.forEach(t => { const w = t - t % 60; for (const d of [20, 40, 60]) if (t < w + d) { const k = w + '-' + (w + d); cum[k] = (cum[k] || 0) + 1; } });
eq(T('time.cumulate').rows.map(r => [secOf(r[1]) + '-' + secOf(r[2]), Number(r[3])]), Object.keys(cum).sort((a, b) => parseInt(a) - parseInt(b) || parseInt(a.split('-')[1]) - parseInt(b.split('-')[1])).map(k => [k, cum[k]]), 'cumulating windows hold the orders by rule');
const tum200 = tumble(200, 60).win; eq(T('time.cumulate').rows.filter(r => secOf(r[2]) - secOf(r[1]) === 60).map(r => Number(r[3])), [0, 60, 120, 180, 240].map(s => tum200[s][0]), 'the last cumulating window of each minute is the tumbling window');
const ses = []; for (const st of ['s01', 's02']) { let cur = null; EV.filter(e => e.store === st).sort((a, b) => a.t - b.t).forEach(e => { if (cur && e.t < cur.last + 30) { cur.last = e.t; cur.n++; } else { cur = { st, first: e.t, last: e.t, n: 1 }; ses.push(cur); } }); }
eq(T('time.session').rows.map(r => [r[1], secOf(r[2]), secOf(r[3]), Number(r[4])]), ses.map(s => [s.st, s.first, s.last + 30, s.n]), 'session windows with a gap of 30 s, for each store');
eq(T('time.session').rows.filter(r => r[1] === 's01').length, 3, 'three sessions for s01'); eq(C('time.window_models').hop_windows, T('time.hop').rows.length, 'hopping windows counted'); eq(C('time.window_models').cumulate_windows, T('time.cumulate').rows.length, 'cumulating windows counted');

// ---- Lab 5: a checkpoint, a crash and a replay -------------------------------------------------------------------------------------------------------------------
// twelve records; process 5, checkpoint, process 3, crash, then process to the end and checkpoint. A sink that writes at once shows the three records that were written before the crash twice.
function run(mode) {
  const sink = [], open = [], aborted = []; let pos = 0, ck = 0;
  const proc = n => { for (let i = 0; i < n && pos < 12; i++) { pos++; (mode === 'alo' ? sink : open).push(pos); } };
  const commit = () => { ck = pos; sink.push(...open); open.length = 0; };
  proc(5); commit(); proc(3); aborted.push(...open); open.length = 0; pos = ck; proc(99); commit();
  const seenRec = new Set(); let dups = 0; sink.forEach(x => { if (seenRec.has(x)) dups++; seenRec.add(x); });
  return { sink, dups, aborted, distinct: seenRec.size };
}
const A = run('alo'), E = run('eo');
eq([A.sink.length, A.dups, A.aborted.length, A.distinct], [15, 3, 0, 12], 'at-least-once sink by hand: 15 records, 3 twice, none aborted'); eq([E.sink.length, E.dups, E.aborted.length, E.distinct], [12, 0, 3, 12], 'exactly-once sink by hand: 12 records, none twice, 3 aborted');
eq(A.sink, [1, 2, 3, 4, 5, 6, 7, 8, 6, 7, 8, 9, 10, 11, 12], 'the at-least-once sink'); eq(E.sink, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 'the exactly-once sink');
const AL = C('state.copy_alo'), EO = C('state.copy_eo');
[AL, EO].forEach(c => { eq(c.records_a_read_committed_reader_sees, c.distinct_orders + c.duplicates, c.guarantee + ': records seen are the distinct orders plus the duplicates'); eq(c.distinct_orders, c.orders_sent - c.missing, c.guarantee + ': distinct orders are the orders sent minus the missing'); eq(c.records_in_the_log, c.records_a_read_committed_reader_sees + c.records_of_aborted_transactions, c.guarantee + ': the log holds what is seen plus what was aborted'); eq(c.missing, 0, c.guarantee + ': nothing is missing'); });
yes(AL.duplicates > 0 && AL.records_of_aborted_transactions === 0, 'at least once: duplicates and no aborted records'); yes(EO.duplicates === 0 && EO.records_of_aborted_transactions > 0, 'exactly once: no duplicate, and the aborted records are in the log');
eq(AL.checkpoint_before_the_kill, EO.checkpoint_before_the_kill, 'both runs were killed after the same checkpoint number');
const AR = C('state.a_result'); eq([AR.orders_counted, AR.orders_sent, AR.stores], [2400, 2400, 12], 'a killed TaskManager lost no order'); yes(AR.totals_equal_the_truth, 'the totals are the truth'); eq(AR.job_state, 'RUNNING', 'the job runs again');
const BR = C('state.b_result'); eq([BR.final_state, BR.checkpoints_completed, BR.restart_strategy_message], ['FAILED', 0, true], 'without checkpoints the job ends FAILED, with no restart strategy');
yes(BR.exception_chain.length === 2 && /^org\.apache\.flink\.runtime\.JobException: Recovery is suppressed by NoRestartBackoffTimeStrategy$/.test(BR.exception_chain[0]) && /^Caused by: org\.apache\.flink\.runtime\.(resourcemanager\.exceptions\.ResourceManagerException|jobmaster\.JobMasterException): TaskManager with id <taskmanager> is no longer reachable\.$/.test(BR.exception_chain[1]), 'the failure without checkpoints: recovery is suppressed, because a TaskManager is no longer reachable (the resource manager or the JobMaster reports it, whichever heartbeat ends first)');
const SP = C('state.savepoint_result'); eq(SP.orders_counted, SP.first_batch + SP.second_batch, 'the savepoint carried the first batch into the second job'); eq(C('state.no_savepoint_result').orders_counted_by_the_new_job, 600, 'a new job counted only the 600 orders that arrived after it started');
eq(C('state.no_savepoint_result').orders_in_the_topic, SP.first_batch + SP.second_batch + 600, 'the topic held the two batches and the 600');
// the truth for the counts: the rule of the Brewline orders, worked out here
const share = [338, 80, 80, 81, 81, 70, 61, 60, 50, 40, 30, 29];
const storeOf = i => { const r = (i * 389) % 1000; let acc = 0; for (let k = 0; k < 12; k++) { acc += share[k]; if (r < acc) return STORES[k]; } return STORES[11]; };
const centsOf = i => 300 + (i * 37) % 500;
const truth = n => { const o = {}; for (let i = 0; i < n; i++) { const s = storeOf(i); (o[s] = o[s] || [0, 0]); o[s][0]++; o[s][1] += centsOf(i); } return o; };
eq(ORD.map(o => [o[0], o[1], o[3]]), Array.from({ length: 12 }, (_, i) => [i + 1, storeOf(i), centsOf(i)]), 'the first twelve orders follow the rule of the Brewline orders');
const OPS = T('datastream.orders_per_store').rows, tr = truth(1200); eq(OPS.map(r => [r[0], r[1], r[2]]), Object.keys(tr).sort().map(k => [k, tr[k][0], tr[k][1]]), 'orders and cents of each store for 1,200 orders by the rule');
eq(sum(OPS.map(r => r[1])), 1200, '1,200 orders'); yes(OPS.find(r => r[0] === 's01')[1] > 0.3 * 1200, 'store s01 sells more than a third of the orders');
const RS = C('datastream.restored'); RS.sample.forEach(r => eq([Number(r[1]), Number(r[2])], tr[r[0]], 'the totals of ' + r[0] + ' after the restart are the truth'));
eq(RS.orders_in_total, 1200, 'the restart counted 1,200 orders'); eq(C('datastream.first_run').orders, 600, 'the first run counted 600 orders');

// ---- Lab 6: the size of the state of a join ---------------------------------------------------------------------------------------------------------------------
const ST = T('joins.state_size').rows, reg = ST.map(r => r[1]), itv = ST.map(r => r[2]), ttl = ST.map(r => r[3]), SS = C('joins.state_summary');
eq(ST.map(r => r[0]), [1, 2, 3, 4, 5, 6, 7, 8, 9], 'nine checkpoints'); eq(SS.checkpoints, 9, 'the summary counts nine');
const diffs = reg.slice(1).map((v, i) => v - reg[i]); yes(diffs.every(d => d > 0), 'the state of the join with no bound grows at every checkpoint'); yes(Math.max(...diffs) - Math.min(...diffs) <= 0.05 * Math.min(...diffs), 'it grows by about the same amount each time (a straight line)');
eq([SS.regular_first, SS.regular_last], [reg[0], reg[8]], 'first and last size of the unbounded join'); eq([SS.interval_first, SS.interval_last, SS.interval_max], [itv[0], itv[8], Math.max(...itv)], 'the interval join sizes'); eq([SS.ttl_first, SS.ttl_last, SS.ttl_max], [ttl[0], ttl[8], Math.max(...ttl)], 'the time to live sizes');
near(SS.ratio_regular_to_interval_last, reg[8] / itv[8], 'the ratio of the last sizes', 0.05); yes(itv.slice(3).every(v => v >= 0.99 * Math.max(...itv)), 'the interval join stops growing after about three checkpoints (six seconds)');
yes(Math.max(...ttl.slice(-3)) <= 1.35 * Math.min(...ttl.slice(-3)), 'the join with a time to live is flat at the end'); yes(ttl[8] < reg[8] && itv[8] < reg[8], 'both bounded joins end below the unbounded one');
const grow = (reg[8] - reg[0]) / 16;                                   // bytes a second: eight checkpoints of two seconds
near(grow, 44000, 'the unbounded join grows by about 44,000 bytes a second', 3000);
near(grow * 3600 / 1048576, 151, 'an hour of that is about 151 MiB at 200 rows a second on each side', 12); near(grow * 400 / 200 * 3600 / 1048576, 302, 'twice the rate makes twice the state', 24);
const DUP = T('joins.dup_input').rows, order1 = {}; DUP.forEach(r => { (order1[r[1]] = order1[r[1]] || []).push(r); });
const first = Object.keys(order1).map(k => ['+I', String(order1[k][0][1]), order1[k][0][2], String(order1[k][0][3]), order1[k][0][4]]); eq(str(T('joins.dedup_first').rows), first.map(r => r.map(String)), 'keep first: the first row of each order, as inserts');
const lastChanges = []; const cur = {}; DUP.forEach(r => { const row = [r[1], r[2], r[3], r[4]], old = cur[r[1]]; if (!old) lastChanges.push(['+I'].concat(row)); else if (JSON.stringify(old) !== JSON.stringify(row)) { lastChanges.push(['-U'].concat(old)); lastChanges.push(['+U'].concat(row)); } cur[r[1]] = row; });
eq(str(T('joins.dedup_last').rows), str(lastChanges), 'keep last: a later copy replaces the earlier one, and a copy that changes nothing sends nothing'); eq(C('joins.dedup_summary'), { distinct_orders: 4, input_rows: 8 }, 'eight rows for four orders');
yes(/NoUniqueKey/.test(X('joins.plan_regular')) && /IntervalJoin/.test(X('joins.plan_interval')) && /leftLowerBound=-5000, leftUpperBound=5000/.test(X('joins.plan_interval')), 'the plan of the plain join and of the interval join');
yes(/^\+- Join\(/.test(X('joins.plan_plain_timestamp')) && /NoUniqueKey/.test(X('joins.plan_plain_timestamp')), 'the same time condition on plain timestamp columns is a plain join');

// ---- Lab 7: which task holds a key (the murmur hash of Flink, written again with BigInt) -------------------------------------------------------------------------
const M32 = 0xffffffffn, u = x => BigInt.asUintN(32, BigInt(x)), toInt = x => Number(BigInt.asIntN(32, x));
const rotl = (x, r) => ((x << BigInt(r)) | (x >> BigInt(32 - r))) & M32;
function bitMix(x) { x ^= x >> 16n; x = (x * 0x85ebca6bn) & M32; x ^= x >> 13n; x = (x * 0xc2b2ae35n) & M32; x ^= x >> 16n; return x; }
function murmurHash(code) {                                            // MathUtils.murmurHash of Flink
  let x = u(code); x = (x * 0xcc9e2d51n) & M32; x = rotl(x, 15); x = (x * 0x1b873593n) & M32; x = rotl(x, 13); x = (x * 5n + 0xe6546b64n) & M32; x ^= 4n; const v = toInt(bitMix(x));
  return v >= 0 ? v : v !== -2147483648 ? -v : 0;
}
function javaStringHash(s) { let h = 0n; for (const ch of s) h = (h * 31n + BigInt(ch.charCodeAt(0))) & M32; return toInt(h); }
const keyGroup = (k, max) => murmurHash(javaStringHash(k)) % max, taskOf = (kg, max, p) => Math.floor(kg * p / max);
const KG = T('datastream.key_groups').rows; eq(KG.map(r => r[0]), STORES, 'the twelve stores');
KG.forEach(r => { eq(r[1], keyGroup(r[0], 128), 'key group of ' + r[0]); [2, 3, 4].forEach((p, i) => eq(r[2 + i], taskOf(r[1], 128, p), 'task of ' + r[0] + ' at parallelism ' + p)); });
eq(javaStringHash('s01'), 113 * 0 + javaStringHash('s01'), 'the string hash is stable'); eq(javaStringHash('a'), 97, 'the string hash of "a"'); eq(javaStringHash('ab'), 97 * 31 + 98, 'the string hash of "ab"'); eq(javaStringHash('s01'), (115 * 31 + 48) * 31 + 49, 'the string hash of "s01"');
[2, 3, 4].forEach(p => { const held = new Array(p).fill(0); KG.forEach(r => { held[r[2 + p - 2]]++; }); yes(held.every(x => x > 0), 'every task of parallelism ' + p + ' holds at least one store'); eq(sum(held), 12, 'every store sits on one task at parallelism ' + p); });
const roundUp = n => { let x = 1; while (x < n) x *= 2; return x; };
const defMax = p => Math.min(Math.max(roundUp(p + Math.floor(p / 2)), 128), 32768);
const MP = C('datastream.max_parallelism_bounds'); eq([MP.lower_bound, MP.upper_bound], [128, 32768], 'the bounds of the default maximum parallelism'); T('datastream.max_parallelism').rows.forEach(r => eq(r[1], defMax(r[0]), 'default maximum parallelism for an operator of parallelism ' + r[0]));
eq(C('datastream.assignment').keys_seen, 12, 'twelve stores were seen by a running job'); yes(C('datastream.assignment').runtime_equals_keygroup_class_for_p2, 'the running job and the class agree');
const PRT = T('datastream.printed').rows; PRT.forEach(r => { eq(r[2], taskOf(keyGroup(r[0], 128), 128, 2), 'the running job put ' + r[0] + ' on the task that the rule names'); eq(r[1], (r[2] + 1) + '> first order of ' + r[0] + ' seen by subtask ' + r[2], 'the line that the sink printed for ' + r[0]); });
eq(C('datastream.build').release, 17, 'the Java job was compiled for release 17');

// ---- Lab 8: backpressure ---------------------------------------------------------------------------------------------------------------------------------------
// a step of ms milliseconds a record does at most 1000/ms records a second in each of its tasks; the job gets through min(what the source offers, that ceiling)
const model = (rate, ms, p) => { const cap = p * 1000 / ms, thr = Math.min(rate, cap); return { cap, thr, blocked: rate > cap ? Math.round((1 - thr / rate) * 1000) : 0, busy: Math.round(thr / cap * 1000), lag: Math.max(0, rate - thr) }; };
const R1 = C('running.rate_p1'), R4 = C('running.rate_p4'), CP = C('running.compare');
[R1, R4].forEach(r => { const m = model(100000, r.sleep_ms, r.lookup_parallelism); eq(r.ceiling_per_second, m.cap, r.lookup_parallelism + ' task(s): the ceiling is tasks times 1000 over the milliseconds'); near(r.records_per_second, m.cap, r.lookup_parallelism + ' task(s): the measured speed is within 5 percent of the ceiling', 0.05 * m.cap); yes(r.records_per_second <= m.cap, 'the speed does not pass the ceiling'); });
eq([CP.records_per_second_with_1, CP.records_per_second_with_4], [R1.records_per_second, R4.records_per_second], 'the comparison uses the two rates'); near(CP.ratio, R4.records_per_second / R1.records_per_second, 'four tasks, about four times the speed', 0.06); near(CP.ratio, 4, 'the ratio is about 4', 0.6);
const m1 = model(100000, 10, 1), m4 = model(100000, 10, 4); eq([m1.blocked, m1.busy, m4.busy], [999, 1000, 1000], 'a source that offers much more is blocked almost always, and the slow step is always busy'); eq(model(500, 10, 1), { cap: 100, thr: 100, blocked: 800, busy: 1000, lag: 400 }, '500 a second into one task of 10 ms: 400 a second of lag'); eq(model(500, 10, 8).lag, 0, 'eight tasks keep up with 500 a second');
const MET = { 1: T('running.metrics_p1').rows, 4: T('running.metrics_p4').rows };
[1, 4].forEach(p => { const src = MET[p].find(r => /^Source/.test(r[0])), slow = MET[p].find(r => /^slow/.test(r[0]));
  yes(src[4] >= 900 && slow[2] >= 900, p + ' task(s): the source is blocked and the slow step is busy'); eq(slow[1], p, p + ' task(s): the vertex of the slow step has that many tasks'); near(src[2] + src[3] + src[4], 1000, 'busy, idle and blocked time of the source add up to about 1000 ms', 60); near(slow[2] + slow[3] + slow[4], 1000, 'busy, idle and blocked time of the slow step add up to about 1000 ms', 60);
  yes(src[5] > slow[5], 'the source took in more records than the slow step: the slow step is the bottleneck'); const bp = JSON.parse(X('running.backpressure_p' + p)); eq(bp['backpressure-level'], 'high', p + ' task(s): the backpressure report says high'); yes(bp.subtasks[0].ratio >= 0.9, 'the source was blocked at least 90 percent of the time'); });
eq(MET[1].length, 2, 'two vertices with one task for the slow step (the slow step and the sink are chained)'); eq(MET[4].length, 3, 'three vertices with four tasks for the slow step (the sink is a vertex of its own)');

// ---- State backends, files and the CDC runs ---------------------------------------------------------------------------------------------------------------------
const BK = T('state.backends').rows, BSU = C('state.backends_summary');
eq(BK.map(r => r[0]), ['heap (HashMapStateBackend)', 'RocksDB, full checkpoints', 'RocksDB, incremental checkpoints'], 'the three state backends'); eq([BK[0][4], BK[1][4], BK[2][4]], [BSU.heap_written_6, BSU.rocksdb_full_written_6, BSU.rocksdb_incremental_written_6], 'the bytes written by the sixth checkpoint');
eq(BK[0][3], BK[0][1], 'the heap backend writes its whole state at checkpoint 1'); eq(BK[0][4], BK[0][2], 'and at checkpoint 6'); eq(BK[1][4], BK[1][2], 'RocksDB with full checkpoints writes its whole state'); yes(BK[2][4] < BK[2][2], 'incremental RocksDB writes less than its state at checkpoint 6'); eq(BSU.rocksdb_incremental_state_6, BK[2][2], 'the incremental state at checkpoint 6');
yes(BK[0][2] > BK[0][1], 'the state grows while the job runs');
eq(T('state.checkpoint_files').rows.length, 1, 'one file in the checkpoint folder'); yes(/_metadata$/.test(T('state.checkpoint_files').rows[0][0]), 'the file is _metadata'); eq(T('state.savepoint_files').rows.map(r => r[0]), ['_metadata'], 'one file in the savepoint');
const FL = C('connect.files'); yes(FL.before_the_first_checkpoint.every(n => n.startsWith('.')) && FL.after_checkpoints.some(n => !n.startsWith('.')), 'a file is hidden before a checkpoint and visible after'); eq(FL.checkpoints_completed_at_the_first_look, 0, 'no checkpoint had completed at the first look');
const CF = C('cdc.flink_cdc_summary_full'), CD = C('cdc.flink_cdc_summary_default'), CO = X('cdc.flink_cdc_output_full').split('\n'), CDO = X('cdc.flink_cdc_output_default').split('\n');
eq(CO.map(l => l.slice(0, 2)), ['+I', '+I', '+I', '+I', '+I', '+I', '-U', '+U', '-D'], 'five rows of the snapshot, one insert, an update as -U and +U, and a delete'); eq(CF.lines, CO.length, 'the number of lines'); eq(CF.kinds, ['+I', '+U', '-D', '-U'], 'four kinds of change');
yes(CO[7].includes('refunded') && CO[6].includes('paid') && CO[8].startsWith('-D[3,'), 'order 2 changes from paid to refunded, and order 3 is deleted'); yes(CDO.filter(l => l.startsWith('+I[6,')).length >= 2 && !CDO.some(l => /^[-+][UD]/.test(l)), 'the default replica identity: the insert is printed again and no update ever arrives');
yes(CD.job_state === 'RESTARTING' && /REPLICA IDENTITY/.test(CD.error) && CD.failures_recorded >= 2, 'the job with the default replica identity fails again and again'); eq([CF.replica_identity, CD.replica_identity], ['full', 'default'], 'the two replica identities');

console.log(checks + ' checks, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
