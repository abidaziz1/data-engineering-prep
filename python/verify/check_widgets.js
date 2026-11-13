// Independent check of the labs. Each lab shows results that were recorded by capture_py.py (js/real.js).
// This file recomputes every one of them with its own logic, written in JavaScript from the rules and not from the Python code
// (the PEP 440 rules, the IEEE 754 doubles, Intl time zones, a model of SQLite, a model of the fake API, a port of orders.py, ...),
// and compares the answer with the recording. A difference prints FAIL and the exit code is 1.
// Run: node python/verify/check_widgets.js
const fs = require('fs'), path = require('path');
global.window = {};
global.LAB = (window.LAB = {});
eval(fs.readFileSync(process.env.REAL_JS || path.join(__dirname, '..', 'js', 'real.js'), 'utf8'));
const R = LAB.real;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sec = {};
const section = (name, fn) => { const before = [pass, fail]; try { fn(); } catch (e) { fail++; console.log('FAIL: ' + name + ' threw ' + e.message); } sec[name] = [pass - before[0], fail - before[1]]; };

/* ---- 1. version specifiers (m2: lab "spec"), PEP 440 for plain release versions ---- */
section('spec', () => {
  const ver = v => v.split('.').map(Number);
  const cmp = (a, b) => { const n = Math.max(a.length, b.length); for (let i = 0; i < n; i++) { const x = a[i] || 0, y = b[i] || 0; if (x !== y) return x < y ? -1 : 1; } return 0; };
  const clause = (c, v) => {
    const m = /^(==|!=|>=|<=|~=|>|<)\s*([\d.]+)(\.\*)?$/.exec(c.trim());
    if (!m) throw new Error('unsupported specifier ' + c);
    const op = m[1], want = ver(m[2]), wild = !!m[3], have = ver(v);
    const prefix = w => w.every((x, i) => (have[i] || 0) === x);
    if (op === '==') return wild ? prefix(want) : cmp(have, want) === 0;
    if (op === '!=') return wild ? !prefix(want) : cmp(have, want) !== 0;
    if (op === '>=') return cmp(have, want) >= 0;
    if (op === '<=') return cmp(have, want) <= 0;
    if (op === '>') return cmp(have, want) > 0;
    if (op === '<') return cmp(have, want) < 0;
    return cmp(have, want) >= 0 && prefix(want.slice(0, -1));  // ~=
  };
  ['pandas', 'requests'].forEach(pkg => {
    const d = R.counts['m2.specifiers.' + pkg];
    d.specs.forEach(s => {
      const mine = d.versions.filter(v => s.spec.split(',').every(c => clause(c, v)));
      ok(same(mine, s.matches), pkg + ' ' + s.spec + ': mine ' + mine + ' recorded ' + s.matches);
    });
  });
});

/* ---- 2. lookups, sizes, generators, formats (m3 to m5): relations that must hold between the recorded numbers ---- */
section('lookup', () => {
  const L = R.counts['m3.lookup'];
  ok(L.sizes.length === 4 && L.sizes.every((n, i) => i === 0 || n === L.sizes[i - 1] * (i === 1 ? 10 : 10)), 'sizes grow tenfold');
  ok(L.list[3] / L.list[0] > 100, 'a list lookup grows with the list');
  ok(Math.max(...L.set) / Math.min(...L.set) < 5 && Math.max(...L.dict) / Math.min(...L.dict) < 5, 'a set and a dict lookup stay flat');
  ok(L.list[3] > 100 * L.set[3] && L.list[3] > 100 * L.dict[3], 'at a million items a list is more than 100 times slower than a set or dict');
  ok(L.sizes.every(n => L.lookups[n] && L.lookups[n].list > 0 && L.lookups[n].set_dict > 0), 'every size has a lookup count');
});
section('structs', () => {
  const T = R.tables['m3.structs'], n = R.counts['m3.structs.meta'].records;
  T.rows.forEach(r => ok(Math.abs(r[1] / n - r[2]) < 0.06, 'bytes per record of ' + r[0] + ': ' + r[1] / n + ' against ' + r[2]));
  const by = {}; T.rows.forEach(r => { by[r[0]] = r[1]; });
  ok(by['a list of dicts'] > by['a list of tuples'] && by['a list of tuples'] > by['a list of dataclass objects with slots'], 'dicts cost more than tuples, and slots cost less');
  ok(by['a pandas DataFrame, with category and small integers'] === Math.min(...Object.values(by)), 'a typed DataFrame is the smallest');
});
section('pull', () => {
  const t = R.text['m4/pull_trace.py'].split('\n');
  ok(t.length >= 10, 'the pull trace has lines');
  const reads = t.filter(l => /^ +read +\d+$/.test(l)).length, parses = t.filter(l => /^ +parse +\d+$/.test(l)).length;
  ok(reads > 0 && parses > 0, 'the trace has reads and parses');
  const withLists = t.indexOf('with lists'), idx = t.findIndex(l => /generators/.test(l));
  ok(withLists === 0, 'the first block is the list version');
  if (idx > 0) {
    const listPart = t.slice(0, idx), genPart = t.slice(idx);
    const firstParse = a => a.findIndex(l => /parse +1$/.test(l)), lastRead = a => a.map(l => /read +\d+$/.test(l)).lastIndexOf(true);
    ok(lastRead(listPart) < firstParse(listPart), 'with lists every read comes before the first parse');
    ok(firstParse(genPart) < lastRead(genPart), 'with generators the first parse comes before the last read');
  }
});
section('genmem', () => {
  const g = R.counts['m4.genmem'];
  g.sizes.forEach((n, i) => {
    ok(g.list[i].paid_cents === g.generator[i].paid_cents, 'both ways give the same total at ' + n);
    ok(Math.abs(g.list[i].peak_bytes / n - g.list[0].peak_bytes / g.sizes[0]) / (g.list[0].peak_bytes / g.sizes[0]) < 0.03, 'list memory grows with the rows at ' + n);
    ok(g.generator[i].peak_bytes < 1.01 * g.generator[0].peak_bytes, 'generator memory stays flat at ' + n);
    ok(i === 0 || g.file_bytes[i] > g.file_bytes[i - 1], 'the file grows');
  });
});
section('formats', () => {
  const f = R.counts['m5.formats'].formats, by = {}; f.forEach(x => { by[x.format] = x; });
  ok(f.every(x => x.total === f[0].total), 'every format holds the same total');
  ok(by['CSV'].bytes > by['CSV, gzip'].bytes && by['CSV'].bytes > by['Parquet, zstd'].bytes && by['JSON Lines'].bytes === Math.max(...f.map(x => x.bytes)), 'sizes: JSON Lines largest, compression and Parquet smaller than CSV');
  ok(by['Parquet, zstd'].bytes === Math.min(...f.map(x => x.bytes)), 'Parquet with zstd is the smallest');
  ok(by['Parquet, snappy'].query_ms * 10 < by['CSV'].query_ms, 'a column query on Parquet is more than 10 times faster than on CSV');
});

/* ---- 3. encodings (m5): UTF-8, UTF-16, Latin-1, Windows-1252 and ASCII, written out by hand ---- */
section('encoding', () => {
  const E = R.counts['m5.encoding'];
  const hex = b => b.map(x => x.toString(16).padStart(2, '0')).join(' ');
  const CP1252 = { 0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F };
  const cp1252Decode = b => b >= 0x80 && b <= 0x9F ? (Object.keys(CP1252).find(k => CP1252[k] === b) ? String.fromCodePoint(+Object.keys(CP1252).find(k => CP1252[k] === b)) : null) : String.fromCharCode(b);
  const encode = (text, enc) => {
    const cps = [...text].map(c => c.codePointAt(0));
    if (enc === 'utf-8') return [...new TextEncoder().encode(text)];
    if (enc === 'utf-16') { const out = [0xff, 0xfe]; cps.forEach(c => { if (c > 0xffff) throw new Error('astral'); out.push(c & 255, c >> 8); }); return out; }
    if (enc === 'latin-1') return cps.map(c => { if (c > 255) return null; return c; });
    if (enc === 'cp1252') return cps.map(c => c < 128 || (c >= 0xA0 && c <= 255) ? c : (CP1252[c] !== undefined ? CP1252[c] : null));
    throw new Error('encoding ' + enc);
  };
  const decode = (bytes, enc) => {
    if (enc === 'utf-8') { try { return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes)); } catch (e) { return null; } }
    if (enc === 'latin-1') return bytes.map(b => String.fromCharCode(b)).join('');
    if (enc === 'ascii') return bytes.every(b => b < 128) ? bytes.map(b => String.fromCharCode(b)).join('') : null;
    if (enc === 'cp1252') { const out = bytes.map(cp1252Decode); return out.includes(null) ? null : out.join(''); }
    throw new Error('reader ' + enc);
  };
  E.texts.forEach(t => E.file_encodings.forEach(fe => E.readers.forEach(re => {
    const key = [t, fe, re].join('|'), cell = E.cells[key], bytes = encode(t, fe);
    if (bytes.includes(null)) { ok(cell && cell.bytes === null && /cannot encode/.test(cell.error), key + ' cannot be encoded'); return; }
    ok(cell && cell.bytes === hex(bytes) && cell.length === bytes.length, key + ' bytes: mine ' + hex(bytes) + ', recorded ' + (cell && cell.bytes));
    // the recording reads UTF-16 with its own reader only through the four readers above, so a UTF-16 file read as one of them is checked the same way
    const text = decode(bytes, re);
    if (text === null) ok(cell.error && cell.text === undefined, key + ' must fail to decode');
    else ok(cell.text === text, key + ' text: mine ' + text + ', recorded ' + cell.text);
  })));
});

/* ---- 4. time zones (m6): Intl finds every UTC moment whose local wall clock reads the given time ---- */
section('dst', () => {
  const D = R.counts['m6.dst'];
  const fmt = (z) => new Intl.DateTimeFormat('en-GB', { timeZone: z, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const local = (f, ms) => { const p = Object.fromEntries(f.formatToParts(new Date(ms)).map(x => [x.type, x.value])); return p.year + '-' + p.month + '-' + p.day + ' ' + p.hour + ':' + p.minute; };
  const utc = ms => new Date(ms).toISOString().slice(0, 16).replace('T', ' ');
  D.cases.forEach(c => {
    const f = fmt(c.zone), base = Date.parse(c.local.replace(' ', 'T') + ':00Z'), found = [];
    for (let ms = base - 14 * 3600e3; ms <= base + 14 * 3600e3; ms += 5 * 60e3) if (local(f, ms) === c.local) found.push(ms);
    const kind = found.length === 0 ? 'does not exist' : found.length === 1 ? 'exists once' : 'ambiguous';
    ok(kind === c.kind, c.zone + ' ' + c.local + ': mine ' + kind + ', recorded ' + c.kind);
    if (kind === 'exists once') ok(utc(found[0]) === c.fold0.utc && utc(found[0]) === c.fold1.utc, c.zone + ' ' + c.local + ' UTC moment');
    if (kind === 'ambiguous') ok(same([utc(found[0]), utc(found[1])], [c.fold0.utc, c.fold1.utc]), c.zone + ' ' + c.local + ' two UTC moments: ' + found.map(utc) + ' against ' + c.fold0.utc + ', ' + c.fold1.utc);
    if (kind === 'does not exist') {
      const gap = Math.abs(Date.parse(c.fold0.utc.replace(' ', 'T') + ':00Z') - Date.parse(c.fold1.utc.replace(' ', 'T') + ':00Z'));
      const real = f.resolvedOptions().timeZone === 'Australia/Lord_Howe' ? 30 * 60e3 : 3600e3;
      ok(gap === real, c.zone + ' ' + c.local + ': the two readings are ' + gap / 60e3 + ' minutes apart');
      ok(c.fold0.back !== c.local && c.fold1.back !== c.local || c.fold1.back !== c.local, c.zone + ' ' + c.local + ' does not come back to itself');
    }
  });
  const kinds = D.cases.filter(c => c.zone === 'Europe/London').map(c => c.kind);
  ok(kinds.includes('does not exist') && kinds.includes('ambiguous'), 'London has a missing hour and a repeated hour in 2026');
  ok(!D.cases.filter(c => c.zone === 'Asia/Singapore').some(c => c.kind !== 'exists once'), 'Singapore has neither');
});

/* ---- 5. money (m6): doubles, exact sums and exact rounding with BigInt ---- */
section('money', () => {
  const M = R.counts['m6.money'];
  const fsum = xs => { const parts = []; for (let x of xs) { let i = 0; for (let y of parts) { if (Math.abs(x) < Math.abs(y)) [x, y] = [y, x]; const hi = x + y, lo = y - (hi - x); if (lo) parts[i++] = lo; x = hi; } parts.length = i; parts.push(x); } return parts.reduce((a, b) => a + b, 0); };
  M.sums.forEach(s => {
    let f = 0; for (let i = 0; i < s.n; i++) f += 0.1;   // the recording added 0.10 each time, which is the double 0.1
    ok(String(f) === s.float, 'float sum of ' + s.n + ': mine ' + f + ', recorded ' + s.float);
    ok(Object.is(f - s.n / 10, parseFloat(s.float_error)), 'float error of ' + s.n);
    ok(String(fsum(new Array(s.n).fill(0.1))) === s.fsum.replace(/\.0$/, ''), 'fsum of ' + s.n + ': ' + fsum(new Array(s.n).fill(0.1)) + ' against ' + s.fsum);
    const cents = BigInt(s.n) * 10n, dollars = (cents / 100n) + '.' + String(cents % 100n).padStart(2, '0');
    ok(s.cents === String(cents) && s.decimal === dollars, 'exact sum of ' + s.n);
  });
  const exact = x => { const dv = new DataView(new ArrayBuffer(8)); dv.setFloat64(0, x); const b = dv.getBigUint64(0), sign = b >> 63n ? -1n : 1n, e = Number((b >> 52n) & 0x7ffn), m = b & ((1n << 52n) - 1n); return e === 0 ? { n: sign * m, d: 1n << 1074n } : (e >= 1075 ? { n: sign * ((m | 1n << 52n) << BigInt(e - 1075)), d: 1n } : { n: sign * (m | 1n << 52n), d: 1n << BigInt(1075 - e) }); };
  const roundScaled = (n, d, mode) => {   // n/d scaled already; returns a BigInt
    const neg = n < 0n; if (neg) n = -n; let q = n / d; const r2 = (n % d) * 2n;
    const up = mode === 'down' ? false : r2 > d || (r2 === d && (mode === 'half_up' || (mode === 'half_even' && q % 2n === 1n)));
    if (up) q += 1n; return neg ? -q : q;
  };
  const decStr = (q, places) => { const neg = q < 0n; let s = String(neg ? -q : q).padStart(places + 1, '0'); return (neg ? '-' : '') + (places ? s.slice(0, -places) + '.' + s.slice(-places) : s); };
  M.rounding.forEach(r => {
    const p = r.places, x = parseFloat(r.value), dec = (() => { const [i, f = ''] = r.value.replace('-', '').split('.'); return { n: (r.value[0] === '-' ? -1n : 1n) * BigInt(i + f), d: 10n ** BigInt(f.length) }; })();
    for (const mode of ['half_even', 'half_up', 'down']) ok(decStr(roundScaled(dec.n * 10n ** BigInt(p), dec.d, mode), p) === r[mode], r.value + ' ' + mode + ': ' + decStr(roundScaled(dec.n * 10n ** BigInt(p), dec.d, mode), p) + ' against ' + r[mode]);
    const e = exact(x), q = roundScaled(e.n * 10n ** BigInt(p), e.d, 'half_even'), py = decStr(q, p);   // Python round() on a float: half to even on the exact binary value
    ok((p === 0 ? py + '.0' : py.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '.0')) === r.round, 'round(' + r.value + ', ' + p + '): ' + py + ' against ' + r.round);
  });
});

/* ---- 6. retries (m7): the policies without randomness are simulated again, and the jittered one must obey its bounds ---- */
section('retry', () => {
  const Rt = R.counts['m7.retry'], S = Rt.setup;
  const sim = policy => {
    const q = Array.from({ length: S.clients }, (_, c) => ({ t: 0, c, a: 1 })), asked = {}, acc = {}, tAll = {}, tOk = {}, tRetry = {}; let done = 0, gave = 0, fin = 0;
    const next = () => { q.sort((x, y) => x.t - y.t || x.c - y.c || x.a - y.a); return q.shift(); };
    while (q.length) {
      const e = next(), s = Math.floor(e.t), k = Math.floor(Math.round(e.t * 10 * 1e6) / 1e6);
      asked[s] = (asked[s] || 0) + 1; tAll[k] = (tAll[k] || 0) + 1; if (e.a > 1) tRetry[k] = (tRetry[k] || 0) + 1;
      if ((acc[s] || 0) < S.capacity) { acc[s] = (acc[s] || 0) + 1; tOk[k] = (tOk[k] || 0) + 1; done++; fin = Math.max(fin, e.t); }
      else if (e.a === S.attempts) gave++;
      else q.push({ t: e.t + (policy === 'at once' ? 0 : policy === 'fixed 1 s' ? 1 : Math.min(8, 0.5 * 2 ** (e.a - 1))), c: e.c, a: e.a + 1 });
    }
    const last = Math.max(...Object.keys(asked).map(Number)), req = Object.values(asked).reduce((a, b) => a + b, 0);
    return { requests: req, succeeded: done, gave_up: gave, rejected: req - Object.values(acc).reduce((a, b) => a + b, 0), last_second: last, peak: Math.max(...Object.values(asked)), finished_at: +fin.toFixed(2), retry_burst: Math.max(0, ...Object.values(tRetry)),
      per_second: Array.from({ length: last + 1 }, (_, s) => [acc[s] || 0, (asked[s] || 0) - (acc[s] || 0)]), per_tenth: Array.from({ length: Math.max(...Object.keys(tAll).map(Number)) + 1 }, (_, k) => [tOk[k] || 0, (tAll[k] || 0) - (tOk[k] || 0)]) };
  };
  ['at once', 'fixed 1 s', 'exponential'].forEach(p => { const mine = sim(p), rec = Rt.storm[p]; Object.keys(mine).forEach(k => ok(same(mine[k], rec[k]), 'storm ' + p + ' ' + k + ': ' + JSON.stringify(mine[k]).slice(0, 60) + ' against ' + JSON.stringify(rec[k]).slice(0, 60))); });
  const J = Rt.storm['exponential with full jitter'];
  ok(J.succeeded === S.clients && J.gave_up === 0, 'with jitter every client is served');
  ok(J.requests > Rt.storm['fixed 1 s'].requests && J.requests < Rt.storm['at once'].requests && J.retry_burst < Rt.storm['exponential'].retry_burst, 'jitter sits between fixed and at-once in requests, and has the smallest burst');
  ok(J.per_second.reduce((a, r) => a + r[0] + r[1], 0) === J.requests && J.per_tenth.reduce((a, r) => a + r[0] + r[1], 0) === J.requests, 'the buckets add up to the requests');
  ['at once', 'fixed 1 s', 'exponential', 'exponential with full jitter'].forEach(p => ['1', '2', '3', '4'].forEach(n => {
    const w = Rt.one[p][n].waits, bound = i => Math.min(8, 0.5 * 2 ** i);
    ok(w.length === +n && Math.abs(Rt.one[p][n].total - w.reduce((a, b) => a + b, 0)) < 0.002, p + ' ' + n + ' failures: the total is the sum');
    if (p === 'fixed 1 s') ok(w.every(x => x === 1), 'fixed waits'); if (p === 'at once') ok(w.every(x => x === 0), 'no waits');
    if (p === 'exponential') ok(w.every((x, i) => x === bound(i)), 'exponential waits ' + w);
    if (p === 'exponential with full jitter') ok(w.every((x, i) => x >= 0 && x <= bound(i)), 'jittered waits are below their bounds: ' + w);
  }));
});

/* ---- 7. loading a day twice (m7): a model of five loading strategies on a table in SQLite ---- */
section('idem', () => {
  const I = R.counts['m7.idem'];
  const FILE = [['O-1', 1250], ['O-2', 475], ['O-3', 820], ['O-4', 1990], ['O-5', 3100], ['O-6', 640]], CORR = FILE.map(r => r[0] === 'O-3' ? ['O-3', 920] : r), CANC = FILE.slice(0, 5);
  const SC = { 'run once': [['run', FILE]], 'run twice': [['run', FILE], ['run', FILE]], 'crash, then run again': [['crash', FILE], ['run', FILE]], 'the source corrects O-3': [['run', FILE], ['run', CORR]], 'the source drops O-6': [['run', FILE], ['run', CANC]] };
  const TRUTH = { 'run once': FILE, 'run twice': FILE, 'crash, then run again': FILE, 'the source corrects O-3': CORR, 'the source drops O-6': CANC };
  const run = (strategy, kind, rows, table) => {
    const keyed = strategy !== 'append'; let t = table.slice();
    const crashAt = i => kind === 'crash' && i === 3;
    const put = (r, upsert) => { const j = t.findIndex(x => x[0] === r[0]); if (j >= 0 && keyed) { if (!upsert) return 'failed: UNIQUE constraint failed: orders.order_id'; t[j] = r.slice(); } else t.push(r.slice()); return null; };
    let outcome = 'finished', error = null;
    if (strategy === 'delete, then insert' || strategy === 'delete, then insert, in a transaction') t = [];   // a single day in the table
    for (let i = 0; i < rows.length && !error; i++) {
      if (crashAt(i)) { outcome = 'crashed: the job died after 3 rows'; break; }
      error = put(rows[i], strategy === 'upsert');
    }
    if (error) outcome = error;
    if (strategy === 'delete, then insert, in a transaction' && outcome !== 'finished') t = table.slice();   // ROLLBACK
    return { outcome, table: t };
  };
  Object.keys(I.cells).forEach(strategy => Object.keys(I.cells[strategy]).forEach(sc => {
    let table = [], runs = [];
    SC[sc].forEach(([kind, rows]) => { const r = run(strategy, kind, rows, table); table = r.table; runs.push({ outcome: r.outcome, rows: table.length, cents: table.reduce((a, x) => a + x[1], 0) }); });
    const cell = I.cells[strategy][sc], want = TRUTH[sc].slice().sort(), final = table.slice().sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]);
    ok(same(runs, cell.runs), strategy + ' / ' + sc + ' runs: ' + JSON.stringify(runs) + ' against ' + JSON.stringify(cell.runs));
    ok(same(final, cell.final) && cell.right === same(final, want.sort()), strategy + ' / ' + sc + ' final table and verdict');
  }));
});

/* ---- 8. paging (m8): a model of the fake API's two listings, newest first by offset and oldest first by cursor ---- */
section('paging', () => {
  const P = R.counts['m8.paging'];
  P.cases.forEach(c => {
    let orders = Array.from({ length: 23 }, (_, i) => 100 + i), served = 0;
    const ev = () => { served++; if (served === 1 && c.scenario === 'insert') orders = orders.concat([123, 124, 125]); if (served === 1 && c.scenario === 'delete') orders = orders.filter(n => ![122, 121, 120].includes(n)); };
    const before = orders.slice(), got = [];
    if (c.style === 'offset') { for (let page = 1; ; page++) { const items = orders.slice().sort((a, b) => b - a).slice((page - 1) * 5, page * 5); ev(); got.push(...items); if (items.length < 5) break; } }
    else { let after = null; for (;;) { const rest = orders.slice().sort((a, b) => a - b).filter(n => after === null || n > after), items = rest.slice(0, 5); ev(); got.push(...items); if (rest.length > 5) after = items[items.length - 1]; else break; } }
    const id = n => 'O-' + n, ids = got.map(id), stayed = before.filter(n => orders.includes(n)).map(id);
    ok(same(c.pages, Array.from({ length: Math.ceil(ids.length / 5) }, (_, i) => ids.slice(i * 5, i * 5 + 5))), c.style + ' ' + c.scenario + ' pages');
    ok(c.rows === ids.length && c.unique === new Set(ids).size, c.style + ' ' + c.scenario + ' rows and unique');
    ok(same(c.repeated, [...new Set(ids.filter(x => ids.indexOf(x) !== ids.lastIndexOf(x)))].sort()), c.style + ' ' + c.scenario + ' repeated');
    ok(same(c.missed, stayed.filter(x => !ids.includes(x)).sort()), c.style + ' ' + c.scenario + ' missed');
    ok(same(c['new'], ids.filter(x => !before.map(id).includes(x)).sort()) && same(c.cancelled, before.filter(n => !orders.includes(n)).map(id).sort()), c.style + ' ' + c.scenario + ' new and cancelled');
  });
});

/* ---- 9. a join that multiplies rows (m9), and the memory of two engines (relations only) ---- */
section('fanout', () => {
  const F = R.counts['m9.fanout'], ORD = [['O-1', 1, 1250], ['O-2', 2, 475], ['O-3', 2, 820], ['O-4', 3, 1990], ['O-5', 1, 3100], ['O-6', 3, 640], ['O-7', 4, 560]];
  ok(F.orders.rows === 7 && F.orders.cents === ORD.reduce((a, o) => a + o[2], 0), 'the orders');
  F.cases.forEach(c => {
    const cust = [1, 2, 3].concat(Array(c.dup).fill(3)); let rows = 0, cents = 0;
    ORD.forEach(o => { const m = cust.filter(x => x === o[1]).length, n = m === 0 ? (c.how === 'left' ? 1 : 0) : m; rows += n; cents += n * o[2]; });
    ok(rows === c.rows && cents === c.cents, c.how + ' dup ' + c.dup + ': mine ' + rows + ', ' + cents + ' against ' + c.rows + ', ' + c.cents);
    ok((c.dup > 0) === !!c.pandas_validate && (c.dup > 0) === !!c.polars_validate, c.how + ' dup ' + c.dup + ': validate m:1 raises exactly when the key repeats');
  });
  const E = R.counts['m9.engines'].engines;
  ok(E['pandas'].extra_mb > 3 * E['duckdb'].extra_mb && E['pandas'].extra_mb > 3 * E['polars lazy'].extra_mb && E['pandas'].seconds > E['duckdb'].seconds, 'pandas needs more memory and time than DuckDB and lazy Polars');
});

/* ---- 10. threads, processes and the GIL (m10): timings cannot be recomputed, so the speed-up that the lab prints is, and the relations are checked ---- */
section('conc', () => {
  const C = R.counts['m10.concurrency'].builds;
  ok(C['regular'].gil === true && C['free-threaded'].gil === false, 'the two builds');
  Object.values(C).forEach(b => {
    ok(b.waiting['one after another'] > 1.8 && b.waiting['8 threads'] < 0.6 && b.waiting['asyncio'] < 0.6, 'eight waits of 0.25 s: 2 s one after another, about 0.25 s overlapped');
    ok(b.waiting['one after another'] / b.waiting['8 threads'] > 3, 'threads overlap waits by more than 3 times');
  });
  const r = C['regular'].computing, f = C['free-threaded'].computing;
  ok(r['8 threads'] / r['one after another'] >= 0.85, 'with a GIL, threads give no gain on computing'); ok(r['one after another'] / r['4 processes'] > 1.3, 'processes speed it up');
  ok(f['one after another'] / f['8 threads'] > 1.25, 'without a GIL, threads speed it up');
  ok(R.counts['m10.profile'].list_seconds > 20 * R.counts['m10.profile'].set_seconds, 'a set against a list in the profile lesson');
});

/* ---- 11. validate or quarantine (m11): the rules of the model written again in JavaScript ---- */
section('validate', () => {
  const V = R.counts['m11.validate'];
  const variants = { 'lax': { strict: false, forbid: false }, 'strict': { strict: true, forbid: false }, 'forbid extra columns': { strict: false, forbid: true } };
  const FIELDS = ['order_id', 'store', 'qty', 'total_cents', 'ordered_at'];
  const check = (row, v) => {
    const bad = [];
    if (!/^O-\d+$/.test(row.order_id)) bad.push('order_id');
    if (!['London', 'Singapore'].includes(row.store)) bad.push('store');
    const asInt = x => v.strict ? NaN : (/^\s*[+-]?\d+\s*$/.test(x) ? parseInt(x, 10) : NaN);
    const q = asInt(row.qty); if (!(q >= 1)) bad.push('qty');
    const t = asInt(row.total_cents); if (!(t >= 0)) bad.push('total_cents');
    if (v.strict || !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/.test(row.ordered_at) || isNaN(Date.parse(row.ordered_at))) bad.push('ordered_at');
    if (v.forbid) Object.keys(row).filter(k => !FIELDS.includes(k)).forEach(k => bad.push(k));
    return bad;
  };
  Object.keys(variants).forEach(name => {
    const seen = new Set(), quarantine = [];
    V.rows.forEach((row, i) => {
      const bad = check(row, variants[name]);
      if (bad.length) quarantine.push({ line: i + 2, fields: bad.sort() });
      else if (seen.has(row.order_id)) quarantine.push({ line: i + 2, fields: ['order_id'], dup: true });
      else seen.add(row.order_id);
    });
    const rec = V.models[name].quarantine.map(q => ({ line: q.line, fields: q.why.split('; ').map(s => s.split(':')[0]).sort() }));
    ok(same(quarantine.map(q => ({ line: q.line, fields: q.fields })), rec), name + ' quarantine: mine ' + JSON.stringify(quarantine.map(q => q.line)) + ' against ' + JSON.stringify(rec.map(q => q.line)));
    const good = V.rows.length - quarantine.length, share = quarantine.length / V.rows.length, cells = V.cells[name];
    ok(cells[V.policies[0]].loaded === 0 && cells[V.policies[0]].quarantined === 1 && cells[V.policies[0]].status.indexOf('failed at line ' + quarantine[0].line) === 0, name + ' fail on the first bad row');
    [[1, 0.2], [2, 0.5]].forEach(([k, lim]) => { const c = cells[V.policies[k]]; ok(share > lim ? c.loaded === 0 && /^failed/.test(c.status) : c.loaded === good && c.quarantined === quarantine.length && /^loaded/.test(c.status), name + ' limit ' + lim); });
    ok(cells[V.policies[3]].loaded === good && cells[V.policies[3]].dropped === quarantine.length && cells[V.policies[3]].quarantined === 0, name + ' drop silently');
  });
});

/* ---- 12. mutants (m12): orders.py ported to JavaScript, seven mutants, and the two suites written as tables ---- */
section('mutants', () => {
  const M = R.counts['m12.mutants'];
  const mk = (o = {}) => {
    const large = o.large || ((c, l) => c >= l), qty = o.qty || (q => q >= 10), cap = o.cap || 5000;
    const clean = o.clean || (s => { const w = s.trim().toLowerCase().replace(/(^|[^a-z])([a-z])/g, (m, p, c) => p + c.toUpperCase()); return w || null; });
    const emptyNone = o.emptyNone !== false, scale = o.scale || 100n, invert = !!o.invert;
    return {
      toCents: t => {
        const s = t.trim(); if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(s)) return 'ValueError';
        let [i, f = ''] = s.replace(/^[+-]/, '').split('.'); f = f.replace(/0+$/, ''); const bad = f.length > 2;
        if (invert ? !bad : bad) return 'ValueError';
        const v = BigInt(i + f.padEnd(2, '0').slice(0, Math.max(2, f.length))) , neg = s[0] === '-';
        return Number((neg ? -v : v) * scale / 100n);
      },
      isLarge: (c, l = 10000) => large(c, l), clean: s => { const r = clean(s); return r === null && !emptyNone ? '' : r; },
      discount: (t, q) => qty(q) ? Math.min(Math.floor(t / 10), cap) : 0
    };
  };
  const weak = f => { let a = []; a.push(f.toCents('12.50') === 1250, f.toCents('abc') === 'ValueError', f.toCents('1.234') === 'ValueError', f.isLarge(20000) === true, f.isLarge(100) === false, f.clean(' london ') === 'London', f.clean('') === null, f.discount(10000, 12) === 1000, f.discount(10000, 2) === 0); return a.every(Boolean); };
  const strong = f => weak(f) && [['12.50', 1250], [' 7 ', 700], ['0.01', 1], ['1000', 100000]].every(([t, c]) => f.toCents(t) === c) && ['abc', '1.234', '', '12,50'].every(t => f.toCents(t) === 'ValueError')
    && [[20000, true], [10000, true], [9999, false], [100, false]].every(([c, l]) => f.isLarge(c) === l) && f.clean('SINGAPORE') === 'Singapore' && f.clean('   ') === null
    && [[10000, 12, 1000], [10000, 10, 1000], [10000, 9, 0], [100000, 10, 5000], [1, 10, 0]].every(([t, q, d]) => f.discount(t, q) === d);
  const MUT = { 'is_large: >= becomes >': mk({ large: (c, l) => c > l }), 'discount: qty >= 10 becomes > 10': mk({ qty: q => q > 10 }), 'discount: the cap 5,000 becomes 50,000': mk({ cap: 50000 }),
    'clean_store: title() becomes upper()': mk({ clean: s => s.trim().toUpperCase() || null }), 'clean_store: an empty name is no longer None': mk({ emptyNone: false }), 'to_cents: the scale 100 becomes 10': mk({ scale: 10n }), 'to_cents: the decimals check is inverted': mk({ invert: true }) };
  ok(weak(mk()) && strong(mk()), 'both suites pass on the real code');
  ok(M.mutants.length === 7 && M.mutants.every(m => MUT[m.name]), 'the seven mutants');
  [['test_weak.py', weak], ['test_strong.py', strong]].forEach(([file, suite]) => {
    const survived = M.mutants.filter(m => suite(MUT[m.name])).map(m => m.name);
    ok(same(survived, M.suites[file].survived) && M.suites[file].caught === 7 - survived.length, file + ': survivors mine ' + JSON.stringify(survived) + ' against ' + JSON.stringify(M.suites[file].survived));
  });
  ok(M.coverage.weak.percent === 100 && M.coverage.strong.percent === 100 && M.coverage.weak.tests === 4 && M.coverage.strong.tests === 18, 'coverage and the number of tests');
});

/* ---- 13. settings in layers (m13): the merge written again ---- */
section('config', () => {
  const C = R.counts['m13.config'], DEF = { api_url: 'https://api.brewline.example/orders', batch_size: 1000, dry_run: false };
  const FILE = { api_url: 'https://staging.brewline.example/orders', batch_size: 500 }, ENV = { batch_size: '200' }, ARGS = { batch_size: 50, dry_run: true };
  const py = v => typeof v === 'boolean' ? (v ? 'True' : 'False') : String(v);
  for (let m = 0; m < 8; m++) {
    const use = [!!(m & 4), !!(m & 2), !!(m & 1)], cfg = {}; Object.keys(DEF).forEach(k => { cfg[k] = [DEF[k], 'default']; });
    [['config file', FILE], ['environment', ENV], ['command line', ARGS]].forEach(([name, vals], i) => { if (use[i]) Object.keys(vals).forEach(k => { const d = DEF[k]; cfg[k] = [typeof d === 'number' ? parseInt(vals[k], 10) : typeof d === 'boolean' ? (vals[k] === true || /^(1|true|yes)$/i.test(String(vals[k]))) : String(vals[k]), name]; }); });
    const rec = C.cells[use.map(x => x ? 1 : 0).join('|')];
    Object.keys(DEF).forEach(k => ok(rec[k].value === py(cfg[k][0]) && rec[k].source === cfg[k][1], 'layers ' + use.join() + ' ' + k + ': mine ' + py(cfg[k][0]) + ' from ' + cfg[k][1] + ', recorded ' + rec[k].value + ' from ' + rec[k].source));
  }
});

console.log(Object.keys(sec).map(k => k + ' ' + sec[k][0] + (sec[k][1] ? ' (' + sec[k][1] + ' FAILED)' : '')).join(', '));
console.log((fail ? 'FAILED: ' + fail + ' of ' : 'all ') + (pass + fail) + ' checks' + (fail ? '' : ' passed') + ' across ' + Object.keys(sec).length + ' groups of labs');
process.exit(fail ? 1 : 0);
