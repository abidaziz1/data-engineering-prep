// Checks the logic of the lab widgets against the recording and against arithmetic done by hand.
// Run: node databricks/verify/check_widgets.js
const fs = require('fs'), path = require('path');
global.window = global; global.LAB = {};
const root = path.join(__dirname, '..', '..');
const shared = path.join(root, 'shared', 'js') + '/', tut = path.join(root, 'databricks', 'js') + '/';
const load = f => { (0, eval)(fs.readFileSync(f, 'utf8')); };
['config.js', 'real.js'].forEach(f => load(tut + f));
load(shared + 'util.js'); load(tut + 'helpers.js'); load(shared + 'graph.js'); load(shared + 'term.js'); load(tut + 'graphs.js');
load(shared + 'render1.js'); load(shared + 'render2.js'); load(tut + 'widgets.js');

const W = LAB.W, G = LAB.get;
let checks = 0, fails = 0;
const eq = (got, want, what) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) { fails++; console.log('FAIL:', what, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };
const near = (got, want, what) => { checks++; if (Math.abs(got - want) > 1e-9) { fails++; console.log('FAIL:', what, 'got', got, 'want', want); } };

// ---- Delta log lab: replay the recorded commits and compare with the recorded tables ---------------
const L = W.deltalogInfo;
eq(L.versions, [0, 1, 2, 3, 4, 5], 'six versions in the recording');
eq(L.versions.map(v => L.liveAt(v).reduce((a, f) => a + f.rows, 0)), [3, 5, 5, 4, 9, 9], 'the log stats of the live files add up to the rows of each version');
eq(L.versions.map(v => L.rowsAt(v).length), [3, 5, 5, 4, 9, 9], 'the recorded tables have 3, 5, 5, 4, 9 and 9 rows');
eq(L.versions.map(v => L.liveAt(v).length), [1, 2, 2, 2, 5, 1], 'files that are live at each version (an update or delete rewrites one file, the merge adds three, OPTIMIZE joins five into one)');
eq(G.history('delta.orders').map(r => r.operation), ['WRITE', 'WRITE', 'UPDATE', 'DELETE', 'MERGE', 'OPTIMIZE'], 'operations of the six versions');
const d14 = L.diff(1, 4);
eq(d14.filter(x => x[0] === 'added').map(x => x[1][0]), ['O-5006', 'O-5007', 'O-5008', 'O-5009', 'O-5010'], 'version 4 adds five orders to version 1');
eq(d14.filter(x => x[0] === 'changed').map(x => x[1][0] + ' ' + x[2][1] + '>' + x[1][1]), ['O-5002 PLACED>SHIPPED'], 'one order changed status');
eq(d14.filter(x => x[0] === 'removed').map(x => x[1][0]), ['O-5005'], 'the cancelled order was deleted');
eq(L.diff(3, 3), [], 'a version does not differ from itself');
// the file listing: the folder after version 5 holds more data files than the table uses
eq(G.listing('delta.after_v5').files.length - L.liveAt(5).length, 8, 'eight data files are in the folder and not in the table after version 5');

// ---- join lab: operator counts read from the plans, checked by eye against the plan text -------------
const J = W.joinInfo;
const j = k => { const x = J.info(k); return [x.join, x.shuffles, x.broadcasts, x.sorts]; };
eq(j('plan.join_default'), ['BroadcastHashJoin', 0, 1, 0], 'default plan: broadcast join, no shuffle');
eq(j('plan.join_no_broadcast'), ['SortMergeJoin', 2, 0, 2], 'broadcast off: sort-merge join, two shuffles, two sorts');
eq(j('plan.join_hint_shuffle_hash'), ['ShuffledHashJoin', 2, 0, 0], 'shuffle_hash hint: two shuffles, no sort');
eq(j('plan.join_hint_merge'), ['SortMergeJoin', 2, 0, 2], 'merge hint');
eq(j('plan.join_hint_broadcast'), ['BroadcastHashJoin', 0, 1, 0], 'broadcast hint beats a switched-off threshold');
eq(J.plans.length, 5, 'five plans in the lab');
J.plans.forEach(p => { const x = J.info(p.k); eq(G.text(p.k).split('\n')[x.line - 1].includes(x.join), true, 'the highlighted line of ' + p.k + ' holds the join'); });

// ---- skew lab ------------------------------------------------------------------------------------
const sz = G.counts('spark.skew_partition_sizes'), SK = W.skewInfo.stats;
const a = SK(sz.by_key), b = SK(sz.salted_32);
eq([a.sum, b.sum], [300000, 300000], 'both layouts hold the 300,000 rows');
eq([+a.ratio.toFixed(1), +b.ratio.toFixed(1)], [6.6, 1.4], 'biggest partition against the average, by key and with a salt');
near(a.mean, 37500, 'average partition by key');
eq(G.table('spark.skew_top_keys').rows[0], ['K-0', '240000'], '80 percent of the rows have the key K-0');

// ---- data skipping lab ----------------------------------------------------------------------------
const Zs = G.counts('layout.zorder'), S = W.skipInfo;
eq(S.count(Zs.files_before, 'C-0420'), Zs.scan_files_before, 'the ranges predict the 16 files that Spark read before the Z-order');
eq(S.count(Zs.files_after, 'C-0420'), Zs.scan_files_after, 'the ranges predict the 1 file that Spark read after the Z-order');
eq(Zs.files_after.reduce((x, f) => x + f.rows, 0), Zs.files_before.reduce((x, f) => x + f.rows, 0), 'the Z-order kept every row');
eq(Zs.files_after.reduce((x, f) => x + f.rows, 0), 400000, 'the table holds 400,000 rows');
S.customers.forEach(c => { const n = S.count(Zs.files_after, c); eq(n >= 1 && n <= 2, true, c + ' sits in one or two of the 3 files after the Z-order'); });
let worst = 0; for (let n = 0; n < 2000; n++) worst = Math.max(worst, S.count(Zs.files_after, 'C-' + String(n).padStart(4, '0')));
eq(worst, 2, 'no customer needs more than two of the 3 files, and a boundary value needs two');
eq(S.count(Zs.files_before, 'C-1999'), 16, 'every file spans every customer before the Z-order');

// ---- cost lab: every number below was worked out by hand -------------------------------------------
const C = W.dbuCalc, base = { workers: 4, vm: 0.5, dbuh: 1, hours: 2, days: 30, spot: 0 };
const m = o => C.monthly(Object.assign({}, base, o));
eq(C.types.map(t => t.rate), [0.30, 0.55, 0.70], 'example rates: jobs, all-purpose, serverless SQL');
let r = m({ type: 'jobs' });
near(r.dbu, 5 * 1 * 2 * 30, 'jobs: 5 nodes x 1 DBU x 2 h x 30 days = 300 DBUs');
near(r.dbuCost, 300 * 0.30, 'jobs: 300 DBUs at $0.30');
near(r.vmCost, 5 * 0.5 * 2 * 30, 'jobs: 5 VMs x $0.50 x 60 h = $150');
near(r.total, 240, 'jobs: $240 a month');
r = m({ type: 'allp' });
near(r.dbuCost, 165, 'all-purpose: 300 DBUs at $0.55 = $165');
near(r.total, 315, 'all-purpose: $315 a month');
near(m({ type: 'allp' }).dbuCost / m({ type: 'jobs' }).dbuCost, 0.55 / 0.30, 'the all-purpose DBU charge is 0.55/0.30 times the jobs charge');
r = m({ type: 'sql' });
near(r.dbu, 1 * 2 * 30, 'serverless SQL: DBUs are not multiplied by the node count');
near(r.vmCost, 0, 'serverless SQL: no VM charge');
near(r.total, 60 * 0.70, 'serverless SQL: 60 DBUs at $0.70 = $42');
r = m({ type: 'jobs', spot: 0.6 });
near(r.vmCost, (1 + 4 * 0.4) * 0.5 * 2 * 30, 'spot: the driver stays on demand and 4 workers are 60 percent cheaper = $78');
near(r.dbuCost, 90, 'spot does not change the DBU charge');
near(C.billedHours(45, 120), 165 / 60, 'a 45 minute job with 120 idle minutes bills 2.75 hours');
near(C.billedHours(45, 10), 55 / 60, 'a 45 minute job with 10 idle minutes bills 55 minutes');
// the cost round of mission 10, computed again without the widget
const nodes = 9, rate = { allp: 0.55, jobs: 0.30 };
const hand = (t, spot, h) => nodes * 1.5 * h * 30 * rate[t] + (1 + 8 * (1 - spot)) * 0.60 * h * 30;
const big = { workers: 8, vm: 0.60, dbuh: 1.5, hours: 3, days: 30, spot: 0 };
near(C.monthly(Object.assign({}, big, { type: 'allp' })).total, hand('allp', 0, 3), 'cost round: all-purpose total');
near(hand('allp', 0, 3), 1154.25, 'cost round by hand: $1,154.25');
near(C.monthly(Object.assign({}, big, { type: 'jobs' })).total, 850.5, 'cost round: jobs compute $850.50');
near(C.monthly(Object.assign({}, big, { type: 'jobs', spot: 0.6 })).total, 591.3, 'cost round: spot workers $591.30');
near(C.monthly(Object.assign({}, big, { type: 'jobs', spot: 0.6, hours: 2.1 })).total, 413.91, 'cost round: 30 percent shorter run $413.91');

// ---- watermark lab: the replay must agree with what Spark recorded -----------------------------------
const WM = W.watermarkInfo.replay(2);
eq(WM.map(x => x.wm), [537, 555, 561], 'watermarks after the three arrivals are 08:57, 09:15 and 09:21');
eq(WM.map(x => x.dropped), [0, 0, 1], 'only the late event of the third arrival is dropped');
eq(WM.map(x => x.emitted.map(e => e.orders)), [[], [3], [1]], 'windows emitted after each arrival');
eq(WM[2].state[540], 3, 'the first window kept 3 events and not the late one');
eq(G.table('stream.watermark_batch_counts').rows[0][2], '4', 'the batch recount sees 4 events in the first window');

// ---- writer conflict lab ---------------------------------------------------------------------------
const CF = W.conflictInfo;
eq(CF.scenarios.map(s => CF.failed(s.k)), [false, true, false, true], 'which of the four writer pairs fails');
eq(CF.scenarios.length, 4, 'four pairs');

console.log(checks + ' checks, ' + (fails ? fails + ' failed' : 'all passed'));
process.exit(fails ? 1 : 0);
