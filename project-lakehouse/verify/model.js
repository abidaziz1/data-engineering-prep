// An independent model of the pretend source and of the lakehouse pipeline, written for the checks of the lakehouse walkthrough. It shares nothing with the widget or with the project:
// the three days of events are written again here, and the layers are a small simulation: bronze keeps every line, a ledger remembers files by name, silver validates and merges only newer events,
// gold is replaced for the order dates of the orders of a run, and the gate compares the layers. check_widgets.js and e2e_labs.js use it to say what the recording must contain.
'use strict';
const DAY1 = Date.UTC(2026, 2, 1), MIN = 60000, SKUS = ['MUG', 'BEANS-250', 'FILTER', 'GRINDER'];
const iso = ms => new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z');
const when = (day, minute) => iso(DAY1 + (day - 1) * 1440 * MIN + minute * MIN);
const ev = (i, day, o) => Object.assign({ order_id: i, store_id: 1 + (i * 7) % 12, status: 'PLACED', amount_cents: 1000 + (i * 37) % 9000, event_time: when(day, i % 1440), lines: Array.from({ length: 1 + i % 3 }, (_, k) => ({ sku: SKUS[(i + k) % 4], qty: 1 + (i + k) % 3 })) }, o || {});
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, k) => a + k);
const CUT = { cut: true };      // a line that is cut in the middle: it is not JSON

const day1 = () => range(1, 300).map(i => ev(i, 1)).concat([ev(301, 1, { amount_cents: -500 }), ev(302, 1, { status: 'LOST' }), ev(303, 1, { store_id: 99 }), ev(7, 1), CUT]);
const files = day => {
  if (day === 1) return { 'date=2026-03-01/part-0001.json': day1() };
  if (day === 2) return { 'date=2026-03-02/part-0002.json': range(305, 420).map(i => ev(i, 2)).concat(range(1, 40).map(i => ev(i, 2, { status: 'SHIPPED', event_time: when(2, 600 + i) })), [ev(41, 2, { status: 'REFUNDED', event_time: when(2, 700) })]), 'date=2026-03-02/replay-part-0001.json': day1() };
  const d3 = range(421, 500).map(i => ev(i, 3));
  d3.slice(0, 20).forEach(e => { e.coupon = 'SPRING'; });
  return { 'date=2026-03-03/part-0001.json': d3.concat([ev(501, 3, { amount_cents: '12.50' }), ev(502, 3, { amount_cents: '9.99' }), ev(5, 1, { event_time: when(1, 3) })]) };
};
// why a record is not valid, or null
function reason(e) {
  if (e.cut) return 'parse_error';
  if (typeof e.amount_cents === 'string') return 'bad_type';
  if (e.order_id == null) return 'missing_order_id';
  if (e.amount_cents == null || e.amount_cents <= 0) return 'bad_amount';
  if (!['PLACED', 'SHIPPED', 'REFUNDED'].includes(e.status)) return 'bad_status';
  if (!(e.store_id >= 1 && e.store_id <= 12)) return 'unknown_store';
  return null;
}
const EXPECTED = ['order_id', 'store_id', 'status', 'amount_cents', 'event_time', 'lines'];

// the runs: [1, 2, 3, 3] is what the walkthrough records. Returns what each run printed, the counts after it, and the versions of silver.
function simulate(days) {
  const ledger = new Set(), silver = new Map(), gold = new Map(), quarantine = [];
  let bronze = 0; const runs = [], after = [], versions = [{ version: 0, op: 'WRITE', ins: 0, upd: 0, orders: 0, order5: 'not there yet' }];
  days.forEach(day => {
    const all = files(day), fresh = Object.keys(all).sort().filter(f => !ledger.has(f));
    const run = { day, files: fresh.length, bronze_rows: 0, valid: 0, quarantined: 0, inserted: 0, updated: 0, left: 0, gold_rows: 0, gold_days: 0, warning: '', gate: [], nothing_to_do: fresh.length === 0 };
    if (fresh.length) {
      const good = [], fields = new Set();
      fresh.forEach(f => { ledger.add(f); all[f].forEach((e, ln) => { run.bronze_rows++; if (!e.cut) Object.keys(e).forEach(k => fields.add(k)); const why = reason(e); if (why) { run.quarantined++; quarantine.push(why); } else good.push({ e, f, ln }); }); });
      bronze += run.bronze_rows; run.valid = good.length;
      // one event for each order: the latest by time, then by file, then by line
      const latest = new Map();
      good.forEach(g => { const c = latest.get(g.e.order_id), key = [g.e.event_time, g.f, g.ln]; if (!c || key[0] > c.key[0] || (key[0] === c.key[0] && (key[1] > c.key[1] || (key[1] === c.key[1] && key[2] > c.key[2])))) latest.set(g.e.order_id, { e: g.e, key }); });
      const batch = [...latest.values()].map(x => x.e);
      batch.forEach(e => {
        const row = silver.get(e.order_id);
        if (!row) { silver.set(e.order_id, { status: e.status, amount: e.amount_cents, store: e.store_id, time: e.event_time, date: e.event_time.slice(0, 10) }); run.inserted++; }
        else if (e.event_time > row.time) { Object.assign(row, { status: e.status, amount: e.amount_cents, store: e.store_id, time: e.event_time }); run.updated++; }      // the order date stays
      });
      run.left = batch.length - run.inserted - run.updated;
      const dates = [...new Set(batch.map(e => silver.get(e.order_id).date))].sort();
      dates.forEach(d => gold.delete(d));
      const rows = new Map();
      [...silver.values()].filter(r => dates.includes(r.date) && r.status !== 'REFUNDED').forEach(r => { const k = r.date + '|' + r.store, g = rows.get(k) || { date: r.date, orders: 0, revenue: 0 }; g.orders++; g.revenue += r.amount; rows.set(k, g); });
      rows.forEach((g, k) => gold.set(k, g));
      run.gold_rows = rows.size; run.gold_days = dates.length;
      const extra = [...fields].filter(k => !EXPECTED.includes(k)).sort();
      run.warning = extra.join(', ');
      const live = [...silver.values()].filter(r => r.status !== 'REFUNDED'), rev = live.reduce((a, r) => a + r.amount, 0);
      run.gate = ['PASS every bronze row of the run is valid or quarantined: ' + (run.valid + run.quarantined), 'PASS silver has one row for each order: ' + silver.size, 'PASS gold revenue equals silver revenue without the refunded orders: ' + rev, 'PASS gold orders equal silver orders without the refunded ones: ' + live.length];
      versions.push({ version: versions.length, op: 'MERGE', ins: run.inserted, upd: run.updated, orders: silver.size, order5: silver.get(5).status });
    }
    runs.push(run);
    const g = [...gold.values()], s = [...silver.values()];
    after.push({ bronze, ledger: ledger.size, silver: silver.size, silver_distinct: silver.size, order5: silver.has(5) ? silver.get(5).status : null, shipped: s.filter(r => r.status === 'SHIPPED').length, refunded: s.filter(r => r.status === 'REFUNDED').length,
      quarantine: quarantine.length, gold: g.length, gold_orders: g.reduce((a, x) => a + x.orders, 0), gold_revenue: g.reduce((a, x) => a + x.revenue, 0) });
  });
  const reasons = {}; quarantine.forEach(r => { reasons[r] = (reasons[r] || 0) + 1; });
  const goldDays = new Set([...gold.values()].map(g => g.date)), goldStores = new Set([...gold.keys()].map(k => k.split('|')[1]));
  return { runs, after, versions, reasons, gold: { rows: gold.size, days: goldDays.size, stores: goldStores.size } };
}

// the text that a run printed
function runText(r) {
  const out = ['python -m lakehouse.run --day ' + r.day, 'day ' + r.day + ': ' + r.files + ' new files, ' + r.bronze_rows + ' bronze rows'];
  if (r.nothing_to_do) return out.concat('nothing to do: every file is in the ledger').join('\n');
  out.push('silver: ' + r.valid + ' valid, ' + r.quarantined + ' quarantined; merge inserted ' + r.inserted + ', updated ' + r.updated + ', left ' + r.left + ' alone', 'gold: ' + r.gold_rows + ' rows for ' + r.gold_days + ' days');
  if (r.warning) out.push('warning: unexpected fields in the files: ' + r.warning);
  return out.concat(r.gate).join('\n');
}
// the text of the tour
function tourText(s) {
  const pad = (x, w) => x + ' '.repeat(Math.max(0, w - x.length));
  const out = ['python -m lakehouse.tour', 'history of silver:'];
  s.versions.forEach(v => out.push('  version ' + v.version + '  ' + v.op + (v.op === 'MERGE' ? ', inserted ' + v.ins + ', updated ' + v.upd : '')));
  out.push('', 'silver as it was at each version:');
  s.versions.forEach(v => out.push('  version ' + v.version + ': ' + v.orders + ' orders, order 5 is ' + v.order5));
  out.push('', 'quarantine by reason:');
  Object.keys(s.reasons).sort().forEach(r => out.push('  ' + pad(r, 14) + ' ' + s.reasons[r]));
  out.push('', 'gold: ' + s.gold.rows + ' rows, ' + s.gold.days + ' days, ' + s.gold.stores + ' stores');
  return out.join('\n');
}
module.exports = { simulate, runText, tourText, files, reason, ev, when };
