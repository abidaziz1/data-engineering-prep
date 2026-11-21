// An independent model of the Brewline shop and of the dlt load with a cursor and a lookback, written for the checks of the ELT walkthrough. It shares nothing with the widgets or with the project:
// the rules of the data are written again here (orders, lines, prices, the traps of day 3), and the load is a small simulation. check_widgets.js and e2e_labs.js use it to say what the recording must contain.
'use strict';
const PRICES = { MUG: 900, 'BEANS-250': 1800, FILTER: 350, GRINDER: 4900 }, SKUS = Object.keys(PRICES);
const T0 = Date.UTC(2026, 2, 1), MIN = 60000;
const stamp = (day, i) => T0 + (day - 1) * 1440 * MIN + ((i * 7) % 1440) * MIN;
function order(i, day, trap) {
  const lines = []; for (let k = 0; k < 1 + i % 3; k++) lines.push({ sku: SKUS[(i + k) % 4], qty: 1 + (i + k) % 3 });
  if (trap) lines.push({ sku: 'CAPSULE-10', qty: 1 });
  return { id: i, store: 1 + (i * 7) % 12, status: 'PLACED', total: lines.reduce((a, l) => a + l.qty * (PRICES[l.sku] || 1200), 0), ts: stamp(day, i), lines };
}
// every order that the shop holds at the end of a day (1 to 3), as a Map
function ordersOn(day) {
  const m = new Map();
  for (let i = 1; i <= 200; i++) m.set(i, order(i, 1));
  if (day >= 2) { for (let i = 1; i <= 20; i++) Object.assign(m.get(i), { status: 'SHIPPED', ts: stamp(2, i) }); for (let i = 201; i <= 230; i++) m.set(i, order(i, 2)); Object.assign(m.get(21), { status: 'REFUNDED', ts: stamp(2, 21) }); }
  if (day >= 3) { for (let i = 231; i <= 255; i++) m.set(i, order(i, 3, i === 240)); for (let i = 31; i <= 35; i++) Object.assign(m.get(i), { status: 'SHIPPED', ts: stamp(3, i) }); }
  return m;
}
const sorted = day => [...ordersOn(day).values()].sort((a, b) => a.id - b.id);

// the loads of the DAG: each run reads the orders changed at or after (cursor - 1 hour), drops the rows at that time that it already saw (by key), merges the rest, and moves the cursor
function runs(days) {
  let table = new Map(), last = null, seen = new Set();
  const wrote = [];
  days.forEach(d => {
    const since = last === null ? -Infinity : last - 3600 * 1000;
    const cand = sorted(d).filter(o => o.ts >= since);
    const read = cand.filter(o => !(o.ts === since && seen.has(o.id)));
    wrote.push(read.length);
    read.forEach(o => table.set(o.id, o));
    if (cand.length) { const top = Math.max(...cand.map(o => o.ts)); const newest = last === null ? top : Math.max(last, top); const atTop = cand.filter(o => o.ts === newest).map(o => o.id); seen = newest === last ? new Set([...seen, ...atTop]) : new Set(atTop); last = newest; }
  });
  return { wrote, table, last };
}
const lineCount = os => os.reduce((a, o) => a + o.lines.length, 0);
const revenue = os => os.reduce((a, o) => a + o.total, 0);

module.exports = { ordersOn, sorted, runs, lineCount, revenue, PRICES };

// what each run wrote, in rows of orders and of lines
module.exports.runDetail = days => {
  let table = new Map(), last = null, seen = new Set(); const out = [];
  days.forEach(d => {
    const since = last === null ? -Infinity : last - 3600 * 1000;
    const cand = sorted(d).filter(o => o.ts >= since), read = cand.filter(o => !(o.ts === since && seen.has(o.id)));
    out.push({ orders: read.length, lines: lineCount(read) });
    read.forEach(o => table.set(o.id, o));
    if (cand.length) { const top = Math.max(...cand.map(o => o.ts)); const newest = last === null ? top : Math.max(last, top); const atTop = cand.filter(o => o.ts === newest).map(o => o.id); seen = newest === last ? new Set([...seen, ...atTop]) : new Set(atTop); last = newest; }
  });
  return { out, table };
};
// the daily mart from the orders that the warehouse holds: one row for each date and region, without the refunded orders
module.exports.daily = table => {
  const REGIONS = ['north', 'south', 'east'], g = new Map();
  [...table.values()].filter(o => o.status !== 'REFUNDED').forEach(o => { const day = new Date(o.ts).toISOString().slice(0, 10), k = day + '|' + REGIONS[o.store % 3], r = g.get(k) || [0, 0]; r[0]++; r[1] += o.total; g.set(k, r); });
  return [...g.keys()].sort().map(k => { const [d, reg] = k.split('|'); return [d, reg, g.get(k)[0], g.get(k)[1]]; });
};
