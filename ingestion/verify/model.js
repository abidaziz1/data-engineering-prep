// An independent model of the Brewline shop and of the loading strategies, written for the checks of the ingestion course. It shares nothing with the widgets, and nothing with the programs of verify/project:
// the rules of the data are written again here, and the behaviour of a load with a cursor is written as a small simulation. check_widgets.js and e2e_labs.js use it to say what the recording must contain.
// The rules of the cursor (what is read, what at the cursor is dropped) are the ones that the recording shows and the documentation of dlt describes:
//   a run reads the rows with updated_at at or after its start value, drops the rows at the start value that an earlier run already saw (by key when the resource has one, by the whole row when it has none),
//   and keeps the newest updated_at, and the rows at it, as its state. A lag moves the start value back.
'use strict';
const SKUS = ['MUG', 'BEANS-250', 'FILTER', 'GRINDER'];
const ms = s => Date.parse(s);
const START = ms('2026-01-01T00:00:00+00:00');
const T1 = ms('2026-03-01T08:00:00+00:00'), T2a = ms('2026-03-02T09:00:00+00:00'), T2b = ms('2026-03-02T09:30:00+00:00'), T3a = ms('2026-03-03T10:00:00+00:00'), T3b = ms('2026-03-03T10:30:00+00:00'), T3c = ms('2026-03-03T10:40:00+00:00');

function base(i) { return { id: i, status: 'PLACED', total: 1000 + i, ts: T1, lines: 1 + i % 3, text: null, extra: false }; }

// every order that the shop holds at the end of a day (1 to 3), as a Map from id to row
function ordersOn(day) {
  const m = new Map();
  for (let i = 1; i <= 100; i++) m.set(i, base(i));
  if (day >= 2) {
    for (let i = 1; i <= 10; i++) Object.assign(m.get(i), { status: 'SHIPPED', ts: T2a });
    for (let i = 101; i <= 110; i++) m.set(i, Object.assign(base(i), { ts: T2b }));
    m.delete(11);
    m.get(12).status = 'SHIPPED';                                           // updated_at stays
  }
  if (day >= 3) {
    for (let i = 111; i <= 115; i++) m.set(i, Object.assign(base(i), { ts: T3a, extra: true }));     // a coupon and a channel: new columns
    m.set(116, Object.assign(base(116), { ts: T3b, text: '1116' }));                                  // a number sent as text
    m.set(117, Object.assign(base(117), { ts: T3c, text: '11.17' }));                                 // a decimal sent as text
  }
  return m;
}
const sorted = day => [...ordersOn(day).values()].sort((a, b) => a.id - b.id);
const hashOf = o => JSON.stringify([o.id, o.status, o.total, o.ts, o.lines, o.text, o.extra]);

// a pipeline that loads `days` one after the other. opts: strategy (append, replace, merge), key (a primary key on id), cursor, lag (seconds), window ([start, end) in ms, which leaves the state alone)
function load(days, opts) {
  const o = Object.assign({ strategy: 'append', key: false, cursor: false, lag: 0, window: null }, opts);
  let table = [], last = null, seen = new Set();
  const wrote = [];
  days.forEach(d => {
    const all = sorted(d);
    let since = null, candidates = all;
    if (o.window) { since = o.window[0]; candidates = all.filter(r => r.ts >= o.window[0] && r.ts < o.window[1]); }
    else if (o.cursor) { since = last === null ? START : last - o.lag * 1000; candidates = all.filter(r => r.ts >= since); }
    const id = r => (o.key || o.strategy === 'merge' ? 'k' + r.id : 'h' + hashOf(r));
    const read = o.cursor && !o.window ? candidates.filter(r => !(r.ts === since && seen.has(id(r)))) : candidates;
    wrote.push(read.length);
    if (o.strategy === 'append') table = table.concat(read.map(r => Object.assign({}, r)));
    else if (o.strategy === 'replace') table = read.map(r => Object.assign({}, r));
    else read.forEach(r => { const k = table.findIndex(t => t.id === r.id); if (k >= 0) table[k] = Object.assign({}, r); else table.push(Object.assign({}, r)); });
    if (o.cursor && !o.window && candidates.length) {
      const top = Math.max(...candidates.map(r => r.ts)), newest = last === null ? top : Math.max(last, top);
      const atTop = candidates.filter(r => r.ts === newest).map(id);
      seen = newest === last ? new Set([...seen, ...atTop]) : new Set(atTop);
      last = newest;
    }
  });
  return { wrote, table, rows: table.length, distinct: new Set(table.map(r => r.id)).size, last, remembered: seen.size, shop: ordersOn(days[days.length - 1]).size };
}

// day 3 loaded on top of days 1 and 2 (merge with a cursor), under a contract
function drift(mode) {
  const base2 = load([1, 2], { strategy: 'merge', cursor: true });
  const day3 = sorted(3).filter(r => r.ts >= base2.last && !(r.ts === base2.last));
  const newColumn = r => r.extra;                        // coupon and channel: columns that the table does not have
  const newType = r => r.text !== null && !/^\d+$/.test(r.text);       // a text that is not a whole number cannot go in the number column: dlt makes a variant column
  let rows = day3, error = null;
  if (mode === 'columns: freeze' && rows.some(newColumn)) { error = 'columns'; rows = []; }
  if (mode === 'data_type: freeze' && rows.some(newType)) { error = 'data type'; rows = []; }
  if (mode === 'columns: discard_row') rows = rows.filter(r => !newColumn(r));
  const newCols = new Set();
  rows.forEach(r => {
    if (r.extra && mode !== 'columns: discard_value' && mode !== 'columns: discard_row') { newCols.add('coupon'); newCols.add('channel__name'); newCols.add('channel__app__version'); }
    if (newType(r)) newCols.add('total_cents__v_text');
  });
  const order = ['coupon', 'channel__name', 'channel__app__version', 'total_cents__v_text'];
  return { wrote: rows.length, inDestination: base2.rows + rows.length, error, newColumns: order.filter(c => newCols.has(c)) };
}

// the sync modes of the Faker connector through PyAirbyte: 20 users, two syncs
function sync(strategy, full, moves) {
  const N = 20; let rows = 0; const read = [];
  for (let s = 0; s < 2; s++) {
    const got = full || moves || s === 0 ? N : 0;          // an incremental sync reads again only when the cursor moves
    read.push(got);
    rows = strategy === 'append' ? rows + got : got === 0 ? rows : N;       // replace and merge leave 20 users
  }
  return { read, rows: [read[0] === 0 ? 0 : N, rows], distinct: N };
}

module.exports = { ordersOn, sorted, load, drift, sync, START, T1, T2a, T2b };
