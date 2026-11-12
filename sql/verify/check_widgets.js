// Recompute every lab of the SQL tutorial with independent logic and compare it with the recording (js/real.js).
// The labs only show recorded tables and plans. This script rebuilds the same answers from the raw data tables, from the recorded transcripts and
// from arithmetic written here, so a wrong key, a wrong table or a changed recording fails.
// Run: node sql/verify/check_widgets.js      Environment: SQ_REAL=/path/to/real.js checks another recording (used by the controls of verify_sq.py).
const fs = require('fs'), path = require('path');
global.window = global; global.LAB = {};
(0, eval)(fs.readFileSync(process.env.SQ_REAL || path.join(__dirname, '..', 'js', 'real.js'), 'utf8'));
const R = LAB.real, T = k => R.tables[k], C = k => R.counts[k];
let checks = 0; const fails = [];
function eq(got, want, msg) { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(msg + '\n    expected ' + JSON.stringify(want).slice(0, 200) + '\n    got      ' + JSON.stringify(got).slice(0, 200)); }
function objs(name) { const t = T('data.' + name); return t.rows.map(r => { const o = {}; t.cols.forEach((c, i) => { o[c] = r[i]; }); return o; }); }
const num = s => (s === 'NULL' ? null : parseFloat(s));
const fix2 = x => x.toFixed(2);

const orders = objs('orders'), customers = objs('customers');

// ---- lab: the clause stepper (mission 1). Stage row counts from the raw tables.
(function () {
  const custById = {}; customers.forEach(c => { custById[c.customer_id] = c; });
  const joined = orders.filter(o => o.customer_id !== 'NULL' && custById[o.customer_id]);
  const paid = joined.filter(o => o.status === 'paid');
  const groups = {}; paid.forEach(o => { const k = custById[o.customer_id].country; (groups[k] = groups[k] || []).push(num(o.total)); });
  const having = Object.keys(groups).filter(k => groups[k].reduce((a, b) => a + b, 0) > 10);
  eq([0, 1, 2, 3, 4, 5, 6].map(n => T('m1.stage.' + n).rows.length), [joined.length, paid.length, Object.keys(groups).length, having.length, having.length, having.length, having.length], 'clause stepper: row count after each stage');
  eq(T('m1.stage.2').rows.map(r => r[0] + ':' + r[1] + ':' + fix2(num(r[2]))).sort(), Object.keys(groups).map(k => k + ':' + groups[k].length + ':' + fix2(groups[k].reduce((a, b) => a + b, 0))).sort(), 'clause stepper: the groups of stage 3');
})();

// ---- lab: three-valued logic (mission 2)
(function () {
  const V = ['TRUE', 'FALSE', 'NULL'], t = v => (v === 'TRUE' ? true : v === 'FALSE' ? false : null);
  const show = v => (v === null ? 'NULL' : v ? 'true' : 'false');
  const and = (a, b) => (a === false || b === false ? false : a === null || b === null ? null : true);
  const or = (a, b) => (a === true || b === true ? true : a === null || b === null ? null : false);
  const ops = { 'AND': and, 'OR': or, '=': (a, b) => (a === null || b === null ? null : a === b), '<>': (a, b) => (a === null || b === null ? null : a !== b), 'IS NOT DISTINCT FROM': (a, b) => a === b, 'IS DISTINCT FROM': (a, b) => a !== b };
  C('m2.truth').ops.forEach(o => { eq(o.grid.duckdb, V.map(x => V.map(y => show(ops[o.name](t(x), t(y))))), 'truth table of ' + o.name + ' on DuckDB'); eq(o.grid.postgres, o.grid.duckdb, 'truth table of ' + o.name + ': PostgreSQL agrees with DuckDB'); });
  eq(C('m2.truth').not.duckdb, V.map(x => show(t(x) === null ? null : !t(x))), 'NOT on DuckDB');
})();

// ---- lab: join types (mission 3), customers on the left and orders on the right
(function () {
  const ids = new Set(orders.filter(o => o.customer_id !== 'NULL').map(o => o.customer_id));
  const inner = orders.filter(o => o.customer_id !== 'NULL' && customers.some(c => c.customer_id === o.customer_id)).length;
  const custNoOrders = customers.filter(c => !ids.has(c.customer_id)).length, ordersNoCust = orders.length - inner;
  const want = { INNER: inner, LEFT: inner + custNoOrders, RIGHT: inner + ordersNoCust, FULL: inner + custNoOrders + ordersNoCust, CROSS: orders.length * customers.length };
  C('m3.jointypes').types.forEach(t => { ['duckdb', 'postgres', 'sqlite'].forEach(e => eq(t.rows[e], want[t.type], 'join type ' + t.type + ' on ' + e)); });
})();

// ---- lab: fan-out (mission 3). Joins of the 9 paid orders to payments and lines.
(function () {
  const items = objs('order_items'), pays = objs('payments'), paid = orders.filter(o => o.status === 'paid');
  C('m3.fanout').combos.forEach(c => {
    let rows = paid.map(o => ({ o, n: (c.payments ? pays.filter(p => p.order_id === o.order_id).length : 1) * (c.items ? items.filter(i => i.order_id === o.order_id).length : 1) }));
    const nrows = rows.reduce((a, r) => a + r.n, 0), sumAll = rows.reduce((a, r) => a + r.n * num(r.o.total), 0), distinct = [...new Set(paid.map(o => o.total))].reduce((a, v) => a + num(v), 0);
    const want = c.method === 'sum' ? sumAll : c.method === 'distinct' ? distinct : paid.reduce((a, o) => a + num(o.total), 0);
    const got = c.result.duckdb;
    eq([+got[0], +got[1], fix2(+got[2])], [c.method === 'preaggregate' ? paid.length : nrows, paid.length, fix2(want)], 'fan-out ' + c.method + (c.payments ? ' with payments' : '') + (c.items ? ' with lines' : ''));
  });
})();

// ---- lab: grouping sets (mission 4)
(function () {
  const paid = orders.filter(o => o.status === 'paid'), n = (f) => new Set(paid.map(f)).size;
  const sc = n(o => o.store_id + '|' + o.channel), st = n(o => o.store_id), ch = n(o => o.channel);
  const want = { 'by store': st, 'by channel': ch, 'by store and channel': sc, 'ROLLUP (store, channel)': sc + st + 1, 'ROLLUP (channel, store)': sc + ch + 1, 'CUBE (store, channel)': sc + st + ch + 1, 'GROUPING SETS': st + ch + 1 };
  C('m4.sets').variants.forEach(v => eq([v.rows, v.agree], [want[v.label], true], 'grouping variant ' + v.label));
})();

// ---- lab: the recursive CTE (mission 5)
(function () {
  const cats = objs('categories'), out = []; let level = cats.filter(c => c.parent_id === 'NULL'), it = 0;
  while (level.length) { level.sort((a, b) => a.category_id - b.category_id).forEach(c => out.push([String(it), c.category_id, c.name])); const ids = new Set(level.map(c => c.category_id)); level = cats.filter(c => ids.has(c.parent_id)); it++; }
  ['duckdb', 'postgres', 'sqlite'].forEach(e => eq(T('m5.tree_iterations.' + e).rows, out, 'recursive tree iterations on ' + e));
})();

// ---- lab: window frames (mission 6), rebuilt with its own frame logic
(function () {
  const d = T('data.daily_revenue'), vals = d.rows.map(r => parseFloat(r[2])).sort((a, b) => a - b), F = C('m6.frames');
  eq(F.revenues.map(parseFloat), vals, 'frame lab: the ten revenues');
  const grp = []; let g = -1, last = null; vals.forEach(v => { if (v !== last) { g++; last = v; } grp.push(g); });
  ['ROWS', 'RANGE', 'GROUPS'].forEach(mode => ['UNBOUNDED PRECEDING', 'N PRECEDING', 'CURRENT ROW'].forEach(s => ['CURRENT ROW', 'N FOLLOWING', 'UNBOUNDED FOLLOWING'].forEach(e => {
    const N = mode === 'RANGE' ? 10 : 1, mine = vals.map((v, i) => {
      const pos = mode === 'ROWS' ? i : mode === 'RANGE' ? v : grp[i], key = k => (mode === 'ROWS' ? k : mode === 'RANGE' ? vals[k] : grp[k]);
      const lo = s === 'UNBOUNDED PRECEDING' ? -Infinity : s === 'N PRECEDING' ? pos - N : pos, hi = e === 'UNBOUNDED FOLLOWING' ? Infinity : e === 'N FOLLOWING' ? pos + N : pos;
      let sum = 0, n = 0; vals.forEach((w, k) => { const p = key(k); if (p >= lo && p <= hi) { sum += w; n++; } }); return [v, sum, n];
    }).sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
    eq(F.combos[mode + '|' + s + '|' + e].rows.map(r => [parseFloat(r[0]), parseFloat(r[1]), r[2]]), mine, 'frame ' + mode + ' ' + s + ' ' + e);
  })));
})();

// ---- lab: time zone buckets (mission 7), with the time zone rules of Node (Intl)
(function () {
  const B = C('m7.buckets');
  const parts = (ts, tz) => { const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }); const p = {}; f.formatToParts(ts).forEach(x => { p[x.type] = x.value; }); return p; };
  const text = p => p.year + '-' + p.month + '-' + p.day + ' ' + p.hour + ':' + p.minute + ':' + p.second;
  const monday = (y, m, d) => { const dt = new Date(Date.UTC(y, m - 1, d)); const wd = (dt.getUTCDay() + 6) % 7; dt.setUTCDate(dt.getUTCDate() - wd); return dt.toISOString().slice(0, 10); };
  B.tzs.forEach(tz => {
    const local = B.orders.map(o => parts(new Date(o[4].replace(' ', 'T') + 'Z'), tz));
    eq(local.map(text), B.local[tz], 'local times in ' + tz);
    B.units.forEach(unit => {
      const b = local.map(p => unit === 'day' ? p.year + '-' + p.month + '-' + p.day : unit === 'week' ? monday(+p.year, +p.month, +p.day) : p.year + '-' + p.month + '-01');
      eq(B.combos[tz + '|' + unit].buckets, b, 'buckets ' + unit + ' in ' + tz);
      const g = {}; b.forEach((k, i) => { g[k] = g[k] || [0, 0]; g[k][0]++; g[k][1] += parseFloat(B.orders[i][3]); });
      eq(B.combos[tz + '|' + unit].groups, Object.keys(g).sort().map(k => [k, String(g[k][0]), fix2(g[k][1])]), 'bucket groups ' + unit + ' in ' + tz);
    });
  });
})();

// ---- lab: sessions (mission 8)
(function () {
  const S = C('m8.sessions_lab'), ev = S.events.map(e => ({ id: +e[0], c: e[1], ts: e[2], type: e[3], t: Date.parse(e[2].replace(' ', 'T') + 'Z') }));
  S.limits.forEach(n => {
    const byC = {}; ev.forEach(e => { (byC[e.c] = byC[e.c] || []).push(e); });
    const sess = [], of = {};
    Object.keys(byC).forEach(c => { const l = byC[c].sort((a, b) => a.t - b.t || a.id - b.id); let no = 0, cur = null; l.forEach((e, i) => { if (i === 0 || (e.t - l[i - 1].t) / 60000 > n) { no++; cur = { c, no, start: e.ts, end: e.ts, n: 0, types: new Set() }; sess.push(cur); } cur.end = e.ts; cur.n++; cur.types.add(e.type); of[e.id] = no; }); });
    sess.sort((a, b) => (a.c === 'NULL') - (b.c === 'NULL') || (a.c === 'NULL' ? 0 : a.c - b.c) || a.no - b.no);
    const rec = S.combos[String(n)];
    eq(rec.sessions.map(r => [r[0], r[1], r[2], r[3], r[4]]), sess.map(s => [s.c, String(s.no), s.start, s.end, String(s.n)]), 'sessions with a limit of ' + n + ' minutes');
    eq(rec.session_of_event, ev.map(e => of[e.id]), 'session of every event, limit ' + n);
    eq(rec.funnel, S.steps.map(step => sess.filter(s => s.types.has(step)).length), 'funnel, limit ' + n);
  });
})();

// ---- lab: the slowly changing dimension (mission 9)
(function () {
  const dim = objs('customer_dim').map(r => ({ key: +r.customer_key, id: r.customer_id, tier: r.tier, from: r.valid_from, to: r.valid_to, cur: r.is_current === 'true' })), feed = objs('customer_changes');
  const text = d => [String(d.key), d.id, d.tier, d.from, d.to, d.cur ? 'true' : 'false'];
  eq(T('m9.scd2_before.duckdb').rows, dim.map(text), 'SCD lab: the dimension before');
  dim.forEach(d => { if (d.cur && feed.some(f => f.customer_id === d.id && f.tier !== d.tier)) { d.to = '2026-03-09'; d.cur = false; } });
  eq(T('m9.scd2_closed.duckdb').rows, dim.map(text), 'SCD lab: after closing the old rows');
  const add = feed.filter(f => !dim.some(d => d.id === f.customer_id && d.cur && d.tier === f.tier)).sort((a, b) => a.customer_id - b.customer_id);
  let key = Math.max(...dim.map(d => d.key)); add.forEach(f => { dim.push({ key: ++key, id: f.customer_id, tier: f.tier, from: '2026-03-10', to: '9999-12-31', cur: true }); });
  eq(T('m9.scd2_final.duckdb').rows, dim.map(text), 'SCD lab: after inserting the new rows');
  eq(T('m9.scd2.duckdb').rows, dim.map(text), 'SCD lab: the second run changes nothing');
  const cur = {}; dim.filter(d => d.cur).forEach(d => { cur[d.id] = (cur[d.id] || 0) + 1; });
  eq(Object.values(cur).every(v => v === 1), true, 'SCD lab: one current row for each customer');
  const per = {}; dim.forEach(d => { (per[d.id] = per[d.id] || []).push(d); });
  eq(Object.values(per).every(l => l.sort((a, b) => a.from < b.from ? -1 : 1).every((d, i) => i === 0 || l[i - 1].to < d.from)), true, 'SCD lab: the validity periods of a customer do not overlap');
})();

// ---- lab: isolation levels (mission 10). A small model of the three levels, written independently of the recorder.
(function () {
  const L = C('m10.lab'), ser = 'could not serialize access due to concurrent update (40001)', dep = 'could not serialize access due to read/write dependencies among transactions (40001)';
  L.scenarios.forEach(sc => L.levels.forEach(lv => {
    const rc = lv === 'read committed', sr = lv === 'serializable', run = L.runs[sc.id + '|' + lv], outs = run.steps.map(s => s.out);
    let want, final, anomaly;
    if (sc.id === 'nonrep') { want = ['BEGIN', '100', 'UPDATE 1', rc ? '150' : '100', 'COMMIT']; final = '150'; anomaly = rc; }
    else if (sc.id === 'phantom') { want = ['BEGIN', '2', 'INSERT 0 1', rc ? '3' : '2', 'COMMIT']; final = '3'; anomaly = rc; }
    else if (sc.id === 'lost') { want = ['BEGIN', '100', 'BEGIN', '100', 'UPDATE 1', 'COMMIT', rc ? 'UPDATE 1' : 'ERROR: ' + ser, rc ? 'COMMIT' : 'ROLLBACK']; final = rc ? '120' : '110'; anomaly = rc; }
    else { want = ['BEGIN', '2', 'BEGIN', '2', 'UPDATE 1', 'COMMIT', sr ? 'ERROR: ' + dep : 'UPDATE 1', sr ? 'ROLLBACK' : 'COMMIT']; final = sr ? '1' : '0'; anomaly = !sr; }
    eq([outs, run.final, run.anomaly], [want, final, anomaly], 'isolation: ' + sc.id + ' at ' + lv);
  }));
  const dl = C('m10.deadlock');
  eq([dl.victim, dl.steps.filter(s => /deadlock detected \(40P01\)/.test(s.out)).length, dl.final], ['A', 1, ['1, 101', '2, 51']], 'deadlock: one victim, the other session commits');
  const tr = C('m10.transfer');
  eq([tr.autocommit.total_after, tr.transaction.total_after], [String(+tr.before + 150), tr.before], 'transfer: the total with and without a transaction');
  eq([tr.transaction.steps[tr.transaction.steps.length - 1].out, /current transaction is aborted/.test(tr.transaction.steps[3].out)], ['ROLLBACK', true], 'transfer: COMMIT after an error answers ROLLBACK');
})();

// ---- lab: plans (mission 11). Rows read and rows matched are parsed again from the recorded plan text.
(function () {
  const L = C('m11.lab').lab, SC = /^\s*(?:->\s+)?(Seq Scan|Index Only Scan|Index Scan|Bitmap Heap Scan)\b/;
  Object.keys(L).forEach(k => Object.keys(L[k].runs).forEach(d => {
    const r = L[k].runs[d], lines = r.plan.split('\n'); let read = 0, matched = null, scan = '';
    lines.forEach((ln, i) => { const m = SC.exec(ln); if (!m) return; const a = /actual rows=(\d+) loops=(\d+)/.exec(ln); if (!scan) { scan = m[1]; matched = +a[1] * +a[2]; } read += +a[1] * +a[2]; for (let j = i + 1; j < lines.length && !SC.test(lines[j]); j++) { const x = /Rows Removed by (?:Filter|Index Recheck): (\d+)/.exec(lines[j]); if (x) read += +x[1]; } });
    eq([r.scan, r.rows_matched, r.rows_read], [scan, matched, read], 'plan lab: ' + k + ' with ' + d);
  }));
  eq(C('m11.lab').table_rows, 30000, 'plan lab: the table has 30,000 rows');
})();

// ---- lab: grain (mission 12), recomputed from the fact rows
(function () {
  const f = T('m12.dump_fact.duckdb'), ix = c => f.cols.indexOf(c), fact = f.rows.map(r => ({ order: r[ix('order_id')], store: r[ix('store_key')], cust: r[ix('customer_key')], amt: parseFloat(r[ix('line_amount')]) }));
  const total = fact.reduce((a, r) => a + r.amt, 0), row = (n, sum, d, avg) => [String(n), fix2(sum), d, String(+(sum / n).toFixed(2))];
  const g = (keyf) => { const m = {}; fact.forEach(r => { m[keyf(r)] = (m[keyf(r)] || 0) + r.amt; }); return Object.values(m); };
  const norm = r => [r[0], fix2(parseFloat(r[1])), r[2], String(parseFloat(r[3]))];
  eq(norm(T('m12.grain_line.duckdb').rows[0]), [String(fact.length), fix2(total), String(new Set(fact.map(r => r.order)).size), String(parseFloat((total / fact.length).toFixed(2)))], 'grain lab: the order line grain');
  const o = orders; eq(norm(T('m12.grain_order.duckdb').rows[0]), [String(o.length), fix2(o.reduce((a, r) => a + num(r.total), 0)), String(o.length), String(parseFloat((o.reduce((a, r) => a + num(r.total), 0) / o.length).toFixed(2)))], 'grain lab: the order grain');
  const s = g(r => r.store), c = g(r => r.cust);
  eq(norm(T('m12.grain_store.duckdb').rows[0]), [String(s.length), fix2(total), 'NULL', String(parseFloat((total / s.length).toFixed(2)))], 'grain lab: the store grain');
  eq(norm(T('m12.grain_customer.duckdb').rows[0]), [String(c.length), fix2(total), 'NULL', String(parseFloat((total / c.length).toFixed(2)))], 'grain lab: the customer grain');
})();

// ---- lab: the translator (mission 13) and the transcripts: structure and consistency
(function () {
  const X = C('m13.translate');
  X.queries.forEach(q => X.targets.forEach(t => {
    const it = X.results[q].targets[t], ran = X.run_on.indexOf(t) >= 0;
    eq([typeof it.sql === 'string' && it.sql.length > 0, ran ? ['same', 'different', 'error'].indexOf(it.ran) >= 0 : it.ran === undefined, it.ran === 'error' ? !!it.error : true, it.ran === 'different' ? Array.isArray(it.rows) : true], [true, true, true, true], 'translator: ' + q + ' to ' + t);
  }));
  ['m10.dirty', 'm10.replace', 'm10.savepoint', 'm10.locks', 'm10.queue', 'm10.deadlock', 'm10.skew_retry'].forEach(k => eq(C(k).steps.every(s => s.who && s.sql && typeof s.out === 'string'), true, 'transcript ' + k + ' has who, sql and out in every step'));
})();

console.log('check_widgets: ' + checks + ' checks, ' + fails.length + ' failures');
fails.forEach(f => console.log('FAIL ' + f));
process.exit(fails.length ? 1 : 0);
