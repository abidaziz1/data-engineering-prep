// Checks the logic of the lab widgets against what Apache Airflow 3.4.0 returned (airflow/js/real.js) and against arithmetic done by hand.
// The widgets are plain JavaScript. They never call Airflow. This file runs their rules on every case that was recorded and compares.
// Run: node airflow/verify/check_widgets.js            (set AF_REAL=/path/to/real.js to check another recording)
const fs = require('fs'), path = require('path'), crypto = require('crypto');
global.window = global; global.LAB = {};
const root = path.join(__dirname, '..', '..');
const shared = path.join(root, 'shared', 'js') + '/', tut = path.join(root, 'airflow', 'js') + '/';
const load = f => { (0, eval)(fs.readFileSync(f, 'utf8')); };
load(tut + 'config.js'); load(process.env.AF_REAL || (tut + 'real.js'));
load(shared + 'util.js'); load(tut + 'helpers.js'); load(shared + 'graph.js'); load(shared + 'term.js'); load(tut + 'graphs.js');
load(shared + 'render1.js'); load(shared + 'render2.js'); load(tut + 'widgets.js'); load(tut + 'widgets2.js');

const W = LAB.W, G = LAB.get;
let checks = 0, fails = 0;
const eq = (got, want, what) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) { fails++; console.log('FAIL:', what, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };
const near = (got, want, what, tol) => { checks++; if (!(Math.abs(got - want) <= (tol === undefined ? 1e-9 : tol))) { fails++; console.log('FAIL:', what, 'got', got, 'want', want); } };
const ok = (cond, what) => { checks++; if (!cond) { fails++; console.log('FAIL:', what); } };
const t16 = s => s.slice(0, 16).replace('T', ' ');

// ---- cron: the evaluator against the 36 expressions that Airflow's CronTriggerTimetable was asked about ----------------------------
const CRON = G.counts('af.cron'), CI = W.cronInfo, startMs = CI.parseUtc(CRON.start);
const exprs = Object.keys(CRON.exprs);
ok(exprs.length >= 36, 'at least 36 cron expressions were recorded, found ' + exprs.length);
exprs.forEach(e => {
  let mine;
  try { mine = CI.fires(e, startMs, 5).map(CI.fmt); } catch (err) { mine = ['error: ' + err.message]; }
  eq(mine, CRON.exprs[e].fires.map(t16), 'cron "' + e + '": the next five fires after ' + CRON.start);
});
CI.list.forEach(e => ok(CRON.exprs[e], 'the cron lab offers "' + e + '", which was recorded'));
// the day-of-month and day-of-week rule, worked out by hand: both set means either one matches
eq(CI.fires('0 0 13 * 5', CI.parseUtc('2026-03-14T00:00'), 3).map(CI.fmt), ['2026-03-20 00:00', '2026-03-27 00:00', '2026-04-03 00:00'], 'every Friday as well as the 13th: the 13th of March has passed, so Fridays come next');
eq(CI.fires('0 12 1-7 * 1', CI.parseUtc('2026-03-14T00:00'), 3).map(CI.fmt), ['2026-03-16 12:00', '2026-03-23 12:00', '2026-03-30 12:00'], 'days 1 to 7 or a Monday: Mondays in March after the 14th');

// ---- data intervals: the three timetables against Airflow's own runs -----------------------------------------------------------------
const IV = W.intervalInfo, TT = G.counts('af.timetables');
const fmtIv = ms => CI.fmt(ms);
Object.keys(IV.rec).forEach(k => {
  const [kind, expr] = k.split('|'), rec = TT[IV.rec[k]];
  ok(rec, 'a recording exists for ' + k + ' as ' + IV.rec[k]);
  if (!rec) return;
  const mine = IV.runs(kind, expr, IV.start, 3).map(r => ({ logical: fmtIv(r.logical), start: fmtIv(r.start), end: fmtIv(r.end), after: fmtIv(r.runAfter) }));
  const want = rec.runs.slice(0, 3).map(r => ({ logical: t16(r.logical_date), start: t16(r.interval_start), end: t16(r.interval_end), after: t16(r.run_after) }));
  eq(mine, want, 'timetable ' + k + ': the first three runs from 2026-03-01');
  rec.manual.forEach(m => {
    const when = CI.parseUtc(m.run_after), got = IV.manual(kind, expr, when);
    eq({ start: fmtIv(got.start), end: fmtIv(got.end) }, { start: t16(m.interval_start), end: t16(m.interval_end) }, 'timetable ' + k + ': a manual run at ' + t16(m.run_after) + ' infers this interval');
  });
});
IV.hours.forEach(h => ok(TT.cron_interval_utc.manual.some(m => m.run_after.slice(11, 13) === ('0' + h).slice(-2)), 'a manual run at ' + h + ':30 was recorded for the data-interval timetable'));
// scheduled and manual runs: what the task could read
const CTX = G.counts('af.ctx');
eq([CTX.scheduled.has_logical_date, CTX.scheduled.has_data_interval, CTX.manual.has_logical_date, CTX.manual.has_data_interval], [true, true, false, false], 'a manual run without a logical date has no logical date and no data interval');
ok(/ds = <missing>/.test(CTX.manual.show_log) && /ds argument = None/.test(CTX.manual.templated_log), 'a manual run without a logical date has no ds');

// ---- catchup and backfill ------------------------------------------------------------------------------------------------------
const CU = W.catchupInfo, CV = G.counts('af.catchup').variants;
const pOn = CU.plan(4, true, 2), pSer = CU.plan(4, true, 1), pOff = CU.plan(4, false, 16);
eq([pOff.runs, CV.brewline_catchup_off.run_count], [1, 1], 'catchup off: one run');
eq([pOn.runs, pOn.peak, CV.brewline_catchup_on.run_count, CV.brewline_catchup_on.peak_parallel_runs], [5, 2, 5, 2], 'catchup on with max_active_runs 2: five runs, two at a time');
eq([pSer.runs, pSer.peak, CV.brewline_catchup_serial.run_count, CV.brewline_catchup_serial.peak_parallel_runs], [5, 1, 5, 1], 'catchup on with max_active_runs 1: five runs, one at a time');
const BF = G.counts('af.backfill');
eq(CU.backfill(['none', 'none', 'none'], 'none'), ['create', 'create', 'create'], 'a backfill of three days with no runs creates three');
eq(BF.created.length, 3, 'the recorded backfill created three runs');
eq(CU.backfill(['success', 'success', 'success'], 'none'), ['keep', 'keep', 'keep'], 'a second backfill with none creates nothing');
eq(BF.runs_after_second_call - BF.runs_after_first_call, 0, 'the recorded second call with none created no run');
eq(CU.backfill(['success', 'success', 'success'], 'completed'), ['rerun', 'rerun', 'rerun'], 'completed clears finished runs');
ok(BF.tries_after_completed.length === 3 && BF.tries_after_completed.every((n, k) => n > BF.tries_after_none[k]), 'the recorded completed call gave the task of every run another try');
ok(/AlreadyRunningBackfill: Another backfill is running/.test(BF.second_backfill_while_running.error) && BF.second_backfill_while_running.exit_code !== 0, 'a second backfill for the same DAG is refused while the first one runs');
eq(CU.backfill(['success', 'failed', 'none'], 'failed'), ['keep', 'rerun', 'create'], 'failed reruns only the failed run');

// ---- idempotent loads: replay the four runs --------------------------------------------------------------------------------------------
const ID = W.idemInfo;
const SEQ = ['2026-03-14', '2026-03-14', '2026-03-15', '2026-03-14'];
Object.keys(ID.ids).forEach(strategy => {
  let table = {};
  const rec = ID.rows(strategy);
  eq(rec.map(r => r.day), SEQ, strategy + ': the recorded runs are 14, 14, 15, 14 March');
  SEQ.forEach((day, k) => {
    if (strategy === 'append') table[day] = (table[day] || 0) + 3; else table[day] = 3;
    const rows = Object.values(table).reduce((a, b) => a + b, 0);
    eq({ rows, per_day: table }, { rows: rec[k].rows, per_day: rec[k].per_day }, strategy + ': table after run ' + (k + 1));
  });
});

// ---- mapping and XCom ----------------------------------------------------------------------------------------------------------------
const FO = W.fanoutInfo, ME = G.counts('af.mapping_edge');
eq(FO.outcome(0), { kind: 'empty', tasks: 0, mapped: 'skipped' }, 'an empty list maps nothing');
eq(ME.empty.load_store, 'skipped', 'recorded: an empty list leaves the mapped task skipped');
eq(FO.outcome(1100).kind, 'toolong', 'a list longer than max_map_length is too long');
ok(ME.big_list_length > +ME.max_map_length, 'the recorded list is longer than max_map_length');
eq(ME.big.load_store, 'upstream_failed', 'recorded: the mapped task is upstream_failed when the list is too long');
eq(FO.outcome(5), { kind: 'ok', tasks: 5, mapped: 'success' }, 'five stores make five instances');
G.counts('af.xcom_size').rows.forEach(r => ok(r.state === 'success' && r.stored_bytes >= 1000, 'the XCom of ' + r.task + ' was stored'));
eq(G.counts('af.xcom_size').rows.map(r => r.task), ['return_1_kb', 'return_100_kb', 'return_1_mb', 'return_10_mb'], 'the XCom size lab finds its four rows');

// ---- trigger rules: the rule of each trigger rule, written by hand, against 13 x 10 recorded children ------------------------------------
const TR = G.counts('af.trigger_rules'), TI = W.trigInfo;
eq(TR.rules.length, 13, 'thirteen trigger rules');
eq(TR.mixes.length, 10, 'ten mixes of three parents');
let cells = 0;
TR.rules.forEach(rule => TR.mixes.forEach(mix => {
  const s = +mix[0], f = +mix[1], k = +mix[2];
  eq(TI.decide(rule, s, f, k), TR.results[rule][mix], 'rule ' + rule + ' with ' + s + ' succeeded, ' + f + ' failed, ' + k + ' skipped');
  cells++;
}));
eq(cells, 130, 'all 130 cells were compared');
eq(TI.mixOf(['success', 'failed', 'skipped']), '111', 'mix of one of each');
eq(TI.mixOf(['skipped', 'skipped', 'success']), '102', 'mix of one success and two skipped');
// by hand: the rules behind the cleanup, the alert and the join after a branch
eq(['300', '210', '120', '030'].map(m => TR.results.all_done[m]), ['success', 'success', 'success', 'success'], 'all_done runs whatever happened');
eq(['300', '210', '102', '012'].map(m => TR.results.one_failed[m]), ['skipped', 'success', 'skipped', 'success'], 'one_failed runs when something failed');
eq(['300', '102', '003'].map(m => TR.results.none_failed_min_one_success[m]), ['success', 'success', 'skipped'], 'none_failed_min_one_success: the join after a branch runs unless every parent was skipped');

// ---- retries: SHA-1, the formula, and Airflow's own function over the lab's grid --------------------------------------------------------
const RT = W.retryInfo;
['brewline_backoff#call_partner#2026-03-14 00:00:00+00:00#1', 'a', 'The quick brown fox jumps over the lazy dog', 'é#1'.repeat(40)].forEach(s =>
  eq(RT.sha1(s), crypto.createHash('sha1').update(s).digest('hex'), 'my SHA-1 equals the system SHA-1 for "' + s.slice(0, 20) + '"'));
const RG = G.counts('af.retry_grid');
eq(RG.rows.length, 27, 'the grid has 27 settings');
RG.rows.forEach(r => eq([1, 2, 3, 4, 5].map(k => RT.wait(r.delay, r.mult, r.cap || 0, k).wait), r.waits, 'retry_delay ' + r.delay + ', multiplier ' + r.mult + ', cap ' + r.cap + ': waits after tries 1 to 5'));
eq(RT.delays, [...new Set(RG.rows.map(r => r.delay))], 'the lab offers the delays that were run');
eq(RT.mults, [...new Set(RG.rows.map(r => r.mult))], 'the lab offers the multipliers that were run');
eq(RT.caps, [...new Set(RG.rows.map(r => r.cap || 0))], 'the lab offers the caps that were run');
const BO = G.counts('af.backoff');
eq([1, 2, 3, 4].map(k => RT.wait(BO.retry_delay_seconds, BO.multiplier, BO.max_retry_delay_seconds, k).wait), BO.delays_in_database, 'recorded run of brewline_backoff: the due time of each retry equals the lab\'s wait');
eq(BO.delays_from_formula, BO.delays_in_database, 'the recorder\'s own formula equals the database');
ok(RG.rows.filter(r => r.mult === 0 && r.cap).every(r => r.waits.every(w => w === r.delay)), 'without a multiplier the cap changes nothing, in Airflow\'s own function');

// ---- sensors: the segments of each mode against the facts that were computed from the same samples ------------------------------------
const WT = W.waitInfo;
WT.modes.forEach(m => {
  const d = WT.data(m), segs = d.segments, names = Object.keys(segs);
  eq(names, ['wait_1', 'wait_2', 'wait_3', 'wait_4'], m + ': four sensors');
  let slot = 0, endAt = 0;
  names.forEach(n => segs[n].forEach(g => { if (g[0] === 'running' || g[0] === 'queued') slot += g[2] - g[1] + 1; if (g[0] === 'success') endAt = Math.max(endAt, g[1]); }));
  if (m === 'deferrable') ok(d.facts.slot_seconds < 6, 'deferrable: sensors held a slot for only a few seconds');
  if (m === 'reschedule') ok(slot >= d.facts.slot_seconds, m + ': a short check shows as a whole second in the one-second segments, so they never show less than the half-second samples');
  else near(slot, d.facts.slot_seconds, m + ': slot seconds from the one-second segments against the half-second samples', Math.max(3, d.facts.slot_seconds * 0.2));
  near(endAt, d.facts.seconds_until_all_done, m + ': all four done at the same time in both views', 1.5);
  ok(d.facts.max_running <= d.pool_slots, m + ': never more tasks running than slots');
  ok(d.states_seen.length >= 3, m + ': the states seen are listed');
});
eq(WT.data('poke').facts.max_holding_a_slot, 2, 'poke: both slots held');
eq(WT.data('deferrable').facts.max_deferred, 4, 'deferrable: all four sensors deferred at once');
ok(WT.data('poke').facts.slot_seconds > WT.data('reschedule').facts.slot_seconds && WT.data('reschedule').facts.slot_seconds > WT.data('deferrable').facts.slot_seconds, 'slot seconds fall from poke to reschedule to deferrable');

// ---- capacity: the model of pool, DAG limit and priority against the recorded runs -----------------------------------------------------
const CP = W.capInfo, PL = G.counts('af.pools');
// tasks that start within 1.5 seconds of each other are one wave
const waveIndex = rows => { const st = rows.map(r => r.start).sort((a, b) => a - b), cl = []; st.forEach(x => { if (!cl.length || x - cl[cl.length - 1] > 1.5) cl.push(x); }); return rows.map(r => cl.filter(c => r.start - c > 1.5).length); };
[['brewline_pool_two_slots', 2, 16], ['brewline_dag_limit', 128, 2]].forEach(([id, pool, limit]) => {
  const rec = PL[id], p = CP.plan(rec.tasks_count, pool, limit, 32), sorted = rec.tasks.slice().sort((a, b) => a.start - b.start);
  eq(p.peak, rec.peak_running, id + ': most tasks at once');
  eq(waveIndex(sorted), sorted.map((t, k) => p.wave(k)), id + ': the recorded start times fall into the waves that the model gives');
  eq(p.waves, Math.max.apply(null, waveIndex(sorted)) + 1, id + ': number of waves');
});
const pr = PL.brewline_pool_priority;
eq(CP.order(pr.tasks), pr.start_order, 'priority: the highest priority_weight starts first in a one-slot pool');
eq(pr.peak_running, 1, 'priority: one at a time');
eq(CP.plan(6, 1, 16, 32).waves, 6, 'model: six tasks in a one-slot pool take six waves');
eq(CP.plan(6, 128, 16, 32).waves, 1, 'model: with the default pool and limits all six run at once');
eq(CP.plan(6, 6, 4, 32).peak, 4, 'model: the lowest of pool, DAG limit and parallelism decides');

// ---- why a task does not run: what each command printed ------------------------------------------------------------------------------
const FD = G.counts('af.failed_deps');
eq(W.whyInfo.causes.map(c => c.id).sort(), Object.keys(FD).sort(), 'the lab covers every recorded cause');
ok(/Pool Slots Available: Not scheduling since there are 0 open slots in pool/.test(FD.pool_full.failed_deps), 'pool_full message');
ok(/depends_on_past is true/.test(FD.depends_on_past.failed_deps), 'depends_on_past message');
ok(/dag_limit|max_active_tasks|concurrency|DAG/i.test(FD.dag_limit.failed_deps), 'dag_limit message names the DAG limit');
ok(/upstream/i.test(FD.upstream_running.failed_deps), 'upstream_running message names the upstream task');

// ---- assets: the rule that starts a consumer, against the recorded sequences --------------------------------------------------------------
const AS = G.counts('af.assets'), SIM = W.assetInfo.simulate;
let a = SIM(['orders', 'orders', 'orders']);
eq([a.single.length, a.single.every(r => r.orders === 1), a.and.length], [AS.consumer_runs_after_3_events, true, AS.and_consumer_runs_before], 'three orders events: three runs of the first consumer, none of the second');
a = SIM(['orders', 'orders', 'orders', 'customers']);
eq([a.and.length, a.and[0].orders, a.and[0].customers], [AS.and_consumer_runs_after, 3, 1], 'then a customers event: one run that takes all four events');
a = SIM(['orders', 'orders', 'orders', 'customers', 'customers']);
eq(a.and.length, AS.and_runs_after_extra_customers_event, 'a customers event on its own starts nothing');
a = SIM(['orders', 'orders', 'orders', 'customers', 'customers', 'orders']);
eq([a.and.length, a.and[1].orders, a.and[1].customers], [AS.and_runs_after_extra_orders_event, 1, 1], 'an orders event after it starts the next run, with one event of each');
ok(AS.and_consumer_logs_all.length === AS.and_runs_after_extra_orders_event, 'the log of every run of the second consumer was kept');
ok(/orders_raw: 3 event/.test(AS.and_consumer_logs_all[0]) && /customers_raw: 1 event/.test(AS.and_consumer_logs_all[0]), 'the first run of the second consumer says it took 3 orders events and 1 customers event');
ok(AS.consumer_logs.every(l => /orders_raw: 1 event/.test(l)), 'every run of the first consumer took one event');

// ---- parse cost: the arithmetic against the timings ----------------------------------------------------------------------------------
const PC = G.counts('af.parse_cost'), PI = W.parseInfo;
near(PI.pass(1, PC.sleep_at_top_level_seconds, 1), PC.median_seconds['toplevel_slow.py'], 'a file that sleeps 2 seconds takes about 2 seconds to import', 0.1);
ok(PI.pass(100, PC.median_seconds['light.py'], 1) < 0.4 && PI.pass(100, PC.median_seconds['light.py'], 1) > PC.hundred_files_seconds[0] * 0.8, 'hundred light files: the model is within a few times of the measurement (the measurement is warm)');
eq(PI.pass(1000, 2, 2), 1000, 'by hand: 1,000 files of 2 seconds on 2 processes is 1,000 seconds');

// ---- time zones: every recorded local time against the system time zone database ---------------------------------------------------------
const DZ = W.dstInfo;
function localOf(utc, tz) {
  const d = new Date(utc.replace(' ', 'T')), p = {};
  new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', timeZoneName: 'short' }).formatToParts(d).forEach(x => { p[x.type] = x.value; });
  return p.year + '-' + p.month + '-' + p.day + ' ' + p.hour + ':' + p.minute + ':' + p.second + ' ' + p.timeZoneName;
}
const norm = s => s.replace(/GMT\+1/, 'BST').replace(/GMT-4/, 'EDT').replace(/GMT-5/, 'EST');
let dstRuns = 0;
G.counts('af.dst').rows.forEach(r => r.runs.forEach(x => { eq(norm(localOf(x.utc, r.tz)), x.local, r.tz + ' ' + r.expr + ': ' + x.utc + ' is ' + x.local); dstRuns++; }));
ok(dstRuns >= 45, 'at least 45 recorded fire times were checked, found ' + dstRuns);
Object.keys(DZ.cases).forEach(c => ok(DZ.rowsOf(c).length >= 3, 'the time zone lab has three expressions for ' + c));
const springGaps = DZ.rowsOf('America/New_York|spring')[0].runs.map((x, k, arr) => k ? DZ.hoursBetween(arr[k - 1].utc, x.utc) : null).slice(1);
eq(springGaps, [24, 24, 23, 24], 'New York, 02:00: the run on 8 March fires at 03:00 EDT, 24 hours after the 7th, and the next run is 23 hours later');

console.log(checks + ' checks, ' + (fails ? fails + ' failed' : 'all passed'));
process.exit(fails ? 1 : 0);
