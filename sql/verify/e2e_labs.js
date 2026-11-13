// Browser tests for the 15 labs and the 13 diagrams of the SQL tutorial. Every lab is driven through its controls in Chromium, and the numbers it shows are compared
// with values that were worked out by hand, shown in the comments. They are not read from js/real.js, which the labs themselves read.
// Needs Playwright:  npm install playwright && npx playwright install chromium
// Run: node sql/verify/e2e_labs.js      (the generic part of the tests is: node dev/e2e.js sql)
// SQ_REAL=/path/to/real.js serves another recording and SQ_GRAPHS=/path/to/graphs.js other diagrams: verify_sq.py --browser uses them to check that a changed
// recording and a label that is too wide make these tests fail.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const name = 'sql', root = path.join(__dirname, '..', '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

(async () => {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    let f = path.join(root, p);
    if (process.env.SQ_REAL && p === '/' + name + '/js/real.js') f = process.env.SQ_REAL;      // a changed recording, for the controls of verify_sq.py
    if (process.env.SQ_GRAPHS && p === '/' + name + '/js/graphs.js') f = process.env.SQ_GRAPHS;      // changed diagrams, for the same
    if ((!f.startsWith(root) && f !== process.env.SQ_REAL && f !== process.env.SQ_GRAPHS) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end(); }
    res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + srv.address().port + '/' + name + '/index.html';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  const storageKey = (fs.readFileSync(path.join(root, name, 'js', 'config.js'), 'utf8').match(/storageKey:\s*'([^']+)'/) || [])[1];
  await page.addInitScript(([k]) => { try { localStorage.setItem(k, JSON.stringify({ track: 'all', chosen: true })); } catch (e) {} }, [storageKey]);
  await page.goto(url); await page.waitForTimeout(400);

  const go = async key => { await page.evaluate(k => { location.hash = k; }, key); await page.waitForTimeout(30); };
  const text = () => page.evaluate(() => document.querySelector('#stage-body').innerText);
  const bigs = () => page.$$eval('.lab-out .big', els => els.map(e => e.querySelector('b').textContent));
  const caps = () => page.$$eval('.lab-out .big', els => els.map(e => e.querySelector('span').textContent));
  const cls = () => page.$$eval('.lab-out .big', els => els.map(e => e.className.replace('big', '').trim()));
  const tables = () => page.$$eval('.lab .tbl', ts => ts.map(t => [...t.querySelectorAll('tbody tr')].map(r => [...r.children].map(td => td.innerText.trim()))));
  const boxes = () => page.$$eval('.lab .code', bs => bs.map(b => b.querySelector('.file').textContent + '\n' + [...b.querySelectorAll('.ln .tx')].map(e => e.textContent).join('\n')));
  let lab = '';                                                                       // the lab under test, named in the message of a missing control
  const pick = async (act, v) => {
    try { await page.click('[data-act="' + act + '"][data-v="' + v + '"]', { timeout: 3000 }); }
    catch (e) { ok(false, lab + ': the control ' + act + ' = ' + v + ' is not on the screen'); }
    await page.waitForTimeout(12);
  };
  const chipVals = act => page.$$eval('[data-act="' + act + '"]', els => els.map(e => e.getAttribute('data-v')));
  const clean = async where => { lab = where; const t = await text(); ok(!/undefined|NaN|\[object Object\]/.test(t), where + ' shows no undefined, NaN or [object Object]'); };

  // ---------------------------------------------------------------------------------------------------------------------------------
  // Mission 1, the clause stepper. 12 orders; the guest order has no customer, so the join keeps 11. Paid orders among those: 8 (9 paid
  // in all, one of them is the guest order). Paid revenue by country: AU 2 orders 30.50, MY 1 order 5.00, SG 5 orders 82.00: 3 groups.
  // HAVING sum > 10 drops MY. SELECT, ORDER BY and LIMIT 3 keep the 2 rows.
  // ---------------------------------------------------------------------------------------------------------------------------------
  await go('m1-clauses:0'); await clean('clause stepper');
  ok(same(await chipVals('cl-n'), ['0', '1', '2', '3', '4', '5', '6']), 'clause stepper: seven stages');
  const ROWS1 = [11, 8, 3, 2, 2, 2, 2];
  for (let n = 0; n < 7; n++) {
    await pick('cl-n', n);
    ok((await tables())[0].length === ROWS1[n], 'clause stepper, stage ' + n + ': ' + ROWS1[n] + ' rows (got ' + (await tables())[0].length + ')');
  }
  await pick('cl-n', 2);
  ok(same((await tables())[0].map(r => r.slice(0, 3).join(':')).sort(), ['AU:2:30.50', 'MY:1:5.00', 'SG:5:82.00']), 'clause stepper: the three groups of paid orders by country');
  await pick('cl-n', 3);
  ok(same((await tables())[0].map(r => r[0]).sort(), ['AU', 'SG']), 'clause stepper: HAVING sum(total) > 10 keeps AU and SG');
  await go('m1-clauses:1');
  ok((await tables())[0].length === 7, 'clause stepper: the second screen lists the seven stages in the order that the engine runs them');

  // ---------------------------------------------------------------------------------------------------------------------------------
  // Mission 2, three-valued logic. NULL is "unknown". AND is false when either side is false, NULL otherwise when either side is NULL.
  // OR is true when either side is true. = and <> give NULL when either side is NULL. IS [NOT] DISTINCT FROM treats NULL as a value.
  // Rows are the left value (TRUE, FALSE, NULL), columns the right value (TRUE, FALSE, NULL).
  // ---------------------------------------------------------------------------------------------------------------------------------
  const T = 'true', F = 'false', N = 'NULL';
  const TABLE2 = {
    'AND': [[T, F, N], [F, F, F], [N, F, N]],
    'OR': [[T, T, T], [T, F, N], [T, N, N]],
    '=': [[T, F, N], [F, T, N], [N, N, N]],
    '<>': [[F, T, N], [T, F, N], [N, N, N]],
    'IS NOT DISTINCT FROM': [[T, F, F], [F, T, F], [F, F, T]],
    'IS DISTINCT FROM': [[F, T, T], [T, F, T], [T, T, F]]
  };
  const V3 = ['TRUE', 'FALSE', 'NULL'];
  await go('m2-lab:0'); await clean('truth table lab');
  ok(same(await chipVals('nu-op'), Object.keys(TABLE2)), 'truth table lab: the six operators');
  for (const eng of ['duckdb', 'postgres', 'sqlite']) {
    await pick('nu-e', eng);
    for (const op of Object.keys(TABLE2)) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      if (eng !== 'duckdb' && op !== '=' && op !== 'AND') continue;                          // all six operators on DuckDB, two on the others
      await pick('nu-op', op); await pick('nu-a', V3[i]); await pick('nu-b', V3[j]);
      const b = await bigs(), truth = TABLE2[op][i][j];
      const want = eng === 'sqlite' ? { true: '1', false: '0', NULL: 'NULL' }[truth] : truth;      // SQLite has no boolean type: it answers 1 and 0
      ok(b[0] === want, 'truth table lab on ' + eng + ': ' + V3[i] + ' ' + op + ' ' + V3[j] + ' is ' + want + ' (got ' + b[0] + ')');
      ok(b[1] === (truth === T ? 'kept' : 'dropped'), 'truth table lab: WHERE keeps the row only for true (' + V3[i] + ' ' + op + ' ' + V3[j] + ')');
    }
  }
  // NOT IN with a NULL in the list. Customers 6 and 8 never ordered, so NOT EXISTS and the anti join return 2. The orders table has a NULL
  // customer_id (the guest order), so x NOT IN (..., NULL) is never true: 0 rows. Without the NULL, NOT IN returns the 2 customers.
  await go('m2-lab:1');
  for (const eng of ['duckdb', 'postgres', 'sqlite']) {
    await pick('ni-e', eng);
    await pick('ni-fix', 'as written'); ok(same(await bigs(), ['0', '2', '2']), 'NOT IN lab on ' + eng + ', as written: 0, 2 and 2 customers');
    await pick('ni-fix', 'NULLs removed'); ok(same(await bigs(), ['2', '2', '2']), 'NOT IN lab on ' + eng + ', NULLs removed: 2, 2 and 2');
  }

  // ---------------------------------------------------------------------------------------------------------------------------------
  // Mission 3, join types. Customers (8) with orders (12). 11 orders have a customer. Customers 6 and 8 have no order. One order is a guest.
  // INNER 11. LEFT 11 + 2 = 13. RIGHT 11 + 1 = 12. FULL 11 + 2 + 1 = 14. CROSS 8 * 12 = 96.
  // ---------------------------------------------------------------------------------------------------------------------------------
  await go('m3-types:0'); await clean('join type lab');
  const JT = { INNER: 11, LEFT: 13, RIGHT: 12, FULL: 14, CROSS: 96 };
  for (const t of Object.keys(JT)) {
    await pick('jt-t', t);
    ok(same(await bigs(), [String(JT[t]), String(JT[t]), String(JT[t])]), 'join type lab, ' + t + ': ' + JT[t] + ' rows on all three engines (got ' + (await bigs()).join(',') + ')');
    ok((await tables())[0].length === Math.min(JT[t], 14), 'join type lab, ' + t + ': the table shows ' + Math.min(JT[t], 14) + ' rows');
  }
  // LEFT JOIN with a filter on the right table. No filter: 13 rows, 8 customers. Filter in ON: paid matches 8 + 4 customers with none = 12 rows,
  // 8 customers. Filter in WHERE: only the 8 paid matches, on 4 customers.
  await go('m3-types:1');
  for (const [v, want] of [['no filter', ['13', '8']], ['filter in ON', ['12', '8']], ['filter in WHERE', ['8', '4']]]) {
    await pick('jw-v', v);
    ok(same(await bigs(), want), 'join filter lab, ' + v + ': ' + want.join(' rows, ') + ' customers (got ' + (await bigs()).join(',') + ')');
  }
  await pick('jw-v', 'filter in ON'); ok((await cls())[0] === 'good', 'join filter lab: the filter in ON is marked good');
  await pick('jw-v', 'filter in WHERE'); ok((await cls())[0] === 'bad', 'join filter lab: the filter in WHERE is marked bad');

  // ---------------------------------------------------------------------------------------------------------------------------------
  // Mission 3, the fan-out lab. 9 paid orders worth 127.00. Payments: 10 rows for them (one order has two). Lines: 15 rows. Both: 17 rows.
  // A plain sum over the joined rows: 145.50 with payments, 228.00 with lines, 265.00 with both. sum(DISTINCT total) gives 127.00 on these
  // nine orders because no two share a total (luck). Pre-aggregating to one row per order gives 9 rows and 127.00 every time.
  // ---------------------------------------------------------------------------------------------------------------------------------
  await go('m3-fan-lab:0'); await clean('fan-out lab');
  const FAN = {
    'no|no': { rows: 9, sum: '127.00' }, 'no|yes': { rows: 10, sum: '145.50' }, 'yes|no': { rows: 15, sum: '228.00' }, 'yes|yes': { rows: 17, sum: '265.00' }
  };
  for (const key of Object.keys(FAN)) {
    const [items, pay] = key.split('|');
    for (const m of ['sum', 'distinct', 'preaggregate']) {
      await pick('fo-i', items); await pick('fo-p', pay); await pick('fo-m', m);
      const want = [String(m === 'preaggregate' ? 9 : FAN[key].rows), '9', m === 'sum' ? FAN[key].sum : '127.00'];
      ok(same(await bigs(), want), 'fan-out lab, lines ' + items + ', payments ' + pay + ', ' + m + ': ' + want.join(' | ') + ' (got ' + (await bigs()).join(' | ') + ')');
      ok((await cls())[2] === (want[2] === '127.00' ? 'good' : 'bad'), 'fan-out lab, lines ' + items + ', payments ' + pay + ', ' + m + ': the revenue is marked ' + (want[2] === '127.00' ? 'good' : 'bad'));
    }
  }
  await go('m3-fan-lab:1');
  ok((await tables())[0].length === 12, 'fan-out lab: the second screen lists all twelve answers');

  // ---------------------------------------------------------------------------------------------------------------------------------
  // Mission 4, grouping sets. 9 paid orders: 3 stores, 3 channels, 7 (store, channel) pairs. ROLLUP adds one row per store and a grand
  // total: 7 + 3 + 1 = 11 in both orders. CUBE adds the channel rows too: 7 + 3 + 3 + 1 = 14. GROUPING SETS ((store), (channel), ()) = 3 + 3 + 1 = 7.
  // ---------------------------------------------------------------------------------------------------------------------------------
  await go('m4-lab:0'); await clean('grouping lab');
  const variants = await chipVals('ro-v');
  const RO = [3, 3, 7, 11, 11, 14, 7];
  ok(variants.length === 7, 'grouping lab: seven variants');
  for (let k = 0; k < variants.length; k++) {
    await pick('ro-v', variants[k]);
    ok((await bigs())[0] === String(RO[k]), 'grouping lab, ' + variants[k] + ': ' + RO[k] + ' rows (got ' + (await bigs())[0] + ')');
    ok((await tables())[0].length === RO[k], 'grouping lab, ' + variants[k] + ': the table has ' + RO[k] + ' rows');
    ok((await caps())[1].includes('DuckDB') && (await caps())[1].includes('PostgreSQL'), 'grouping lab, ' + variants[k] + ': says that the engines agree');
  }
  await go('m4-lab:1'); ok((await tables())[0].length === 7, 'grouping lab: the second screen lists seven rows');

  // ---------------------------------------------------------------------------------------------------------------------------------
  // Mission 5, the recursive CTE. The tree has 9 categories: Menu (1) with Drinks (2) and Retail (7); Drinks has Coffee (3), Tea (6);
  // Retail has Beans (8), Merch (9); Coffee has two children (4, 5). Levels: 1, 2, 4, 2 rows, then nothing: 1, 3, 7, 9 in all.
  // With category 1 made a child of category 9 and a guard of depth < 20, the walk adds one row for each step of every path: 61 rows.
  // ---------------------------------------------------------------------------------------------------------------------------------
  await go('m5-lab:0'); await clean('recursive lab');
  const REC = [[1, 1], [2, 3], [4, 7], [2, 9], [0, 9]];
  for (let n = 0; n < 5; n++) {
    await pick('rc-n', n);
    const b = await bigs();
    ok(same([b[0], b[1]], [String(REC[n][0]), String(REC[n][1])]), 'recursive lab, iteration ' + n + ': ' + REC[n][0] + ' rows added, ' + REC[n][1] + ' so far (got ' + b[0] + ', ' + b[1] + ')');
    ok(b[2] === (n < 4 ? 'go on' : 'stop'), 'recursive lab, iteration ' + n + ': ' + (n < 4 ? 'go on' : 'stop'));
  }
  await go('m5-lab:1'); ok(same(await bigs(), ['9', '61']), 'recursive lab: 9 categories reached, and 61 rows with a cycle until depth 20 (got ' + (await bigs()).join(',') + ')');

  // ---------------------------------------------------------------------------------------------------------------------------------
  // Mission 6, window frames. Ten daily revenues, sorted: 20 25 30 35 40 45 50 50 55 60. The two 50s are peers.
  // ROWS counts rows around the current row. RANGE counts by value: N PRECEDING is 10 here. GROUPS counts peer groups: N is 1.
  // CURRENT ROW in RANGE and GROUPS includes the peers of the current row; in ROWS it is the row only.
  // ---------------------------------------------------------------------------------------------------------------------------------
  await go('m6-lab-frame:0'); await clean('frame lab');
  const V = [20, 25, 30, 35, 40, 45, 50, 50, 55, 60], GRP = [0, 1, 2, 3, 4, 5, 6, 6, 7, 8];
  const frame = (mode, s, e, i) => {
    const pos = k => mode === 'ROWS' ? k : mode === 'RANGE' ? V[k] : GRP[k], N = mode === 'RANGE' ? 10 : 1, p = pos(i);
    const lo = s === 'UNBOUNDED PRECEDING' ? -Infinity : s === 'N PRECEDING' ? p - N : p;
    const hi = e === 'UNBOUNDED FOLLOWING' ? Infinity : e === 'N FOLLOWING' ? p + N : p;
    let n = 0, sum = 0; V.forEach((v, k) => { if (pos(k) >= lo && pos(k) <= hi) { n++; sum += v; } });
    return [String(n), sum.toFixed(2)];
  };
  let frames = 0;
  for (const mode of ['ROWS', 'RANGE', 'GROUPS']) for (const s of ['UNBOUNDED PRECEDING', 'N PRECEDING', 'CURRENT ROW']) for (const e of ['CURRENT ROW', 'N FOLLOWING', 'UNBOUNDED FOLLOWING']) {
    await pick('fr-mode', mode); await pick('fr-start', s); await pick('fr-end', e);
    for (const i of [0, 6, 7, 9]) {
      await pick('fr-cur', i);
      const b = await bigs(), want = frame(mode, s, e, i); frames++;
      ok(same([b[0], b[1]], want), 'frame lab, ' + mode + ' ' + s + ' to ' + e + ', row ' + (i + 1) + ': ' + want.join(' rows, sum ') + ' (got ' + b[0] + ', ' + b[1] + ')');
    }
  }
  ok(frames === 108, 'frame lab: 27 frames on 4 rows');
  // the example of the lesson: the default frame with a peer gives both 50s a running total of 295.00, ROWS gives 245.00 and 295.00
  await pick('fr-mode', 'RANGE'); await pick('fr-start', 'UNBOUNDED PRECEDING'); await pick('fr-end', 'CURRENT ROW'); await pick('fr-cur', 6);
  ok((await bigs())[1] === '295.00', 'frame lab: the default frame gives the first 50.00 a running total of 295.00');
  await pick('fr-mode', 'ROWS'); ok((await bigs())[1] === '245.00', 'frame lab: ROWS gives the first 50.00 a running total of 245.00');
  await go('m6-lab-frame:1'); ok((await tables())[0].length === 10, 'frame lab: the second screen lists the ten rows');

  // ---------------------------------------------------------------------------------------------------------------------------------
  // Mission 7, time zone buckets. Twelve orders. Number of buckets and number of orders that fall in another bucket than in UTC,
  // worked out with the rules of each time zone (Singapore UTC+8, Sydney UTC+11 in February and March, Los Angeles UTC-8 until 8 March).
  // ---------------------------------------------------------------------------------------------------------------------------------
  await go('m7-lab-bucket:0'); await clean('time zone lab');
  const BK = {
    'UTC|day': [9, 0], 'UTC|week': [3, 0], 'UTC|month': [1, 0],
    'Asia/Singapore|day': [8, 3], 'Asia/Singapore|week': [3, 0], 'Asia/Singapore|month': [1, 0],
    'Australia/Sydney|day': [8, 4], 'Australia/Sydney|week': [3, 0], 'Australia/Sydney|month': [1, 0],
    'America/Los_Angeles|day': [8, 3], 'America/Los_Angeles|week': [3, 0], 'America/Los_Angeles|month': [2, 1]
  };
  for (const key of Object.keys(BK)) {
    const [tz, unit] = key.split('|');
    await pick('bk-tz', tz); await pick('bk-unit', unit);
    ok(same(await bigs(), [String(BK[key][0]), String(BK[key][1])]), 'time zone lab, ' + tz + ' by ' + unit + ': ' + BK[key][0] + ' buckets, ' + BK[key][1] + ' orders elsewhere than in UTC (got ' + (await bigs()).join(',') + ')');
    ok((await tables())[0].length === 12, 'time zone lab, ' + tz + ' by ' + unit + ': twelve orders in the table');
  }

  // ---------------------------------------------------------------------------------------------------------------------------------
  // Mission 8, sessions. A gap longer than the limit starts a new session. Sessions and sessions with a view, a cart, a checkout and a purchase.
  // ---------------------------------------------------------------------------------------------------------------------------------
  await go('m8-lab-sessions:0'); await clean('sessions lab');
  const SESS = { 5: [12, 9, 5, 4, 3], 10: [9, 9, 5, 4, 3], 30: [8, 8, 5, 4, 3], 45: [7, 7, 5, 4, 3], 120: [7, 7, 5, 4, 3] };
  for (const n of Object.keys(SESS)) {
    await pick('ss-n', n);
    ok(same(await bigs(), SESS[n].map(String)), 'sessions lab, a gap limit of ' + n + ' minutes: ' + SESS[n].join(', ') + ' (got ' + (await bigs()).join(', ') + ')');
    ok((await tables())[0].length === SESS[n][0], 'sessions lab, a gap limit of ' + n + ' minutes: one table row for each of the ' + SESS[n][0] + ' sessions');
  }
  await pick('ss-n', 30);
  ok(/63 percent/.test((await caps())[2]) && /80 percent/.test((await caps())[3]) && /75 percent/.test((await caps())[4]), 'sessions lab: the funnel steps are 5 of 8 (63 percent), 4 of 5 (80) and 3 of 4 (75)');

  // ---------------------------------------------------------------------------------------------------------------------------------
  // Mission 9, the slowly changing dimension. Before: customer 1 has two rows (silver until 14 Feb, gold from 15 Feb), customers 2, 4 and 5 one
  // row each: 5 rows, 4 current. The feed: 1 gold (same), 2 gold (changed), 4 silver (same), 9 gold (new). Close the old row of customer 2:
  // 5 rows, 3 current (customer 2 has none until the insert). Insert rows 6 (customer 2) and 7 (customer 9): 7 rows, 5 current. Run again: no change.
  // Overwriting instead relabels the orders that were placed under the old tier: orders 1003 and 1012 of customer 2.
  // ---------------------------------------------------------------------------------------------------------------------------------
  await go('m9-lab-scd:0'); await clean('dimension lab');
  const SCD = [[5, '4'], [5, '3'], [7, '5'], [7, '5']];
  for (let n = 0; n < 4; n++) {
    await pick('sc-n', n);
    const b = await bigs(), t = (await tables())[0];
    ok(same([b[0], b[1]], [String(SCD[n][0]), SCD[n][1]]), 'dimension lab, stage ' + n + ': ' + SCD[n][0] + ' rows, ' + SCD[n][1] + ' current (got ' + b.join(',') + ')');
    ok(t.length === SCD[n][0], 'dimension lab, stage ' + n + ': ' + SCD[n][0] + ' rows in the table');
  }
  await pick('sc-n', 1);
  ok(/customer 2 has none until the insert/.test((await caps())[1]), 'dimension lab, stage 1: says that customer 2 has no current row');
  ok(same((await tables())[0][2], ['3', '2', 'silver', '2026-01-12', '2026-03-09', 'false']), 'dimension lab, stage 1: the old row of customer 2 is closed on 9 March');
  await pick('sc-n', 2);
  ok(same((await tables())[0].slice(5), [['6', '2', 'gold', '2026-03-10', '9999-12-31', 'true'], ['7', '9', 'gold', '2026-03-10', '9999-12-31', 'true']]), 'dimension lab, stage 2: new rows 6 (customer 2) and 7 (customer 9)');
  await pick('sc-n', 3);
  ok(/one for each customer/.test((await caps())[1]) && (await cls())[1] === 'good', 'dimension lab, stage 3: one current row for each customer');
  await pick('sc-n', 4);
  ok(same(await bigs(), ['8', '2']) && same((await tables())[0].filter(r => r[2] !== r[3]).map(r => r[0]), ['1003', '1012']), 'dimension lab, stage 4: overwriting relabels orders 1003 and 1012');

  // ---------------------------------------------------------------------------------------------------------------------------------
  // Mission 10, transcripts of two sessions. Each shows the numbers that the two sessions saw. Hand-worked from the statements:
  //  transfer without a transaction: total 100 + 50 = 150 before; credit of 150 commits, the debit fails: 300 after
  //  transfer in a transaction: 150 before and 150 after
  //  dirty read: PostgreSQL never shows uncommitted data, so A reads 100 while B holds 999
  //  replace: a reader sees the 2 old rows during the replacement and 3 rows after the commit
  //  lost update with an atomic update: 100 + 10 + 20 = 130. With a lock: B waits, reads 110, adds 20: 130
  //  write skew retry: one doctor stays on call. Locks: NOWAIT and lock_timeout raise 55P03. SKIP LOCKED gives B job 2.
  //  queue: A takes job 1, B takes job 2, job 3 is left. Deadlock: the victim is session A (40P01). Savepoint: 4 rows after the commit.
  // ---------------------------------------------------------------------------------------------------------------------------------
  const TX = [
    ['m10-transfer-auto', ['150', '300'], 2], ['m10-transfer-tx', ['150', '150'], 5], ['m10-dirty', ['100', '999'], 7], ['m10-replace', ['2', '3'], 7],
    ['m10-lost-atomic', ['130'], 6], ['m10-lost-lock', ['110', '130'], 8], ['m10-skew-retry', ['1', '1'], 11], ['m10-locks', ['55P03', '2'], 13],
    ['m10-queue', ['1', '2', 'job 3'], 8], ['m10-deadlock', ['deadlock detected', '1, 101 and 2, 51'], 8], ['m10-savepoint', ['4'], 7]
  ];
  for (const [id, want, rows] of TX) {
    await go(id + ':0'); await clean('transcript ' + id);
    ok(same(await bigs(), want), 'transcript ' + id + ': ' + want.join(' | ') + ' (got ' + (await bigs()).join(' | ') + ')');
    ok((await tables())[0].length === rows, 'transcript ' + id + ': ' + rows + ' rows (got ' + (await tables())[0].length + ')');
  }
  await go('m10-queue:0'); ok(/is the only job left pending/.test((await caps())[2]), 'queue transcript: job 3 is the only job left');

  // ---------------------------------------------------------------------------------------------------------------------------------
  // Mission 10, isolation levels, on PostgreSQL. Non-repeatable read and phantom: only read committed lets them happen. Lost update: read committed
  // lets it happen (final 120 where 130 was right); the other levels stop the second writer (final 110). Write skew: read committed and repeatable
  // read both let it happen (0 doctors on call), serializable stops it (1).
  // ---------------------------------------------------------------------------------------------------------------------------------
  await go('m10-lab-iso:0'); await clean('isolation lab');
  const ISO = {
    'nonrep': { 'read committed': [true, '150'], 'repeatable read': [false, '150'], 'serializable': [false, '150'] },
    'phantom': { 'read committed': [true, '3'], 'repeatable read': [false, '3'], 'serializable': [false, '3'] },
    'lost': { 'read committed': [true, '120'], 'repeatable read': [false, '110'], 'serializable': [false, '110'] },
    'skew': { 'read committed': [true, '0'], 'repeatable read': [true, '0'], 'serializable': [false, '1'] }
  };
  for (const sc of Object.keys(ISO)) for (const lv of Object.keys(ISO[sc])) {
    await pick('is-sc', sc); await pick('is-lv', lv);
    const b = await bigs(), c = await cls(), [happened, final] = ISO[sc][lv];
    ok(b[0] === (happened ? 'it happened' : 'prevented') && c[0] === (happened ? 'bad' : 'good') && b[1] === final, 'isolation lab, ' + sc + ' at ' + lv + ': ' + (happened ? 'it happened' : 'prevented') + ', final ' + final + ' (got ' + b[0] + ', ' + b[1] + ')');
  }
  await pick('is-sc', 'lost'); await pick('is-lv', 'repeatable read');
  ok((await text()).includes('could not serialize access due to concurrent update'), 'isolation lab: the lost update at repeatable read ends with the PostgreSQL error 40001');
  await pick('is-sc', 'skew'); await pick('is-lv', 'serializable');
  ok((await text()).includes('could not serialize access due to read/write dependencies among transactions'), 'isolation lab: write skew at serializable ends with the read/write dependency error');

  // ---------------------------------------------------------------------------------------------------------------------------------
  // Mission 11, the plan lab. 30,000 orders. Rows that match: one order by id 1; status paid 27,315 (91 percent); cancelled 1,500; pending 285;
  // one store in one week 579 (store 2 has 7,500 orders, the week has 2,317 orders of all stores); the 10 latest orders 10.
  // Rows read from the table, with the planner's choice recorded on PostgreSQL 16: a Seq Scan reads all 30,000 rows.
  // ---------------------------------------------------------------------------------------------------------------------------------
  await go('m11-lab-plan:0'); await clean('plan lab');
  const PLAN = {
    point: { none: ['Seq Scan', '1', '30,000', 'warn'], order_id: ['Index Scan', '1', '1', 'good'] },
    paid: { none: ['Seq Scan', '27,315', '30,000', 'good'], status: ['Seq Scan', '27,315', '30,000', 'good'] },
    cancelled: { none: ['Seq Scan', '1,500', '30,000', 'warn'], status: ['Bitmap Heap Scan', '1,500', '1,500', 'good'] },
    pending: { none: ['Seq Scan', '285', '30,000', 'warn'], status: ['Index Only Scan', '285', '285', 'good'] },
    range: {
      none: ['Seq Scan', '579', '30,000', 'warn'], store: ['Bitmap Heap Scan', '579', '7,500', 'warn'], ts: ['Bitmap Heap Scan', '579', '2,317', 'warn'],
      store_ts: ['Bitmap Heap Scan', '579', '579', 'good'], ts_store: ['Bitmap Heap Scan', '579', '579', 'good']
    },
    latest: { none: ['Seq Scan', '30,000', '30,000', 'good'], ts: ['Index Scan', '10', '10', 'good'] }
  };
  ok(same((await chipVals('pl-sc')).sort(), Object.keys(PLAN).sort()), 'plan lab: six scenarios');
  for (const sc of Object.keys(PLAN)) {
    await pick('pl-sc', sc);
    ok(same((await chipVals('pl-d')).sort(), Object.keys(PLAN[sc]).sort()), 'plan lab, ' + sc + ': the index choices are ' + Object.keys(PLAN[sc]).join(', '));
    for (const d of Object.keys(PLAN[sc])) {
      await pick('pl-d', d);
      const b = await bigs(), c = await cls(), w = PLAN[sc][d];
      ok(same(b, [w[0], w[1], w[2]]) && c[2] === w[3], 'plan lab, ' + sc + ' with ' + d + ': ' + w.slice(0, 3).join(' | ') + ' (got ' + b.join(' | ') + ', ' + c[2] + ')');
    }
  }

  // ---------------------------------------------------------------------------------------------------------------------------------
  // Mission 12, grain. The star holds 19 order lines for 12 orders worth 156.00 in all (127.00 paid, the rest cancelled or refunded).
  // Rows: lines 19, orders 12, stores 4, customers 7. The sum is 156.00 at every grain. The average of a row: 156 / 19 = 8.21,
  // 156 / 12 = 13.0, 156 / 4 = 39.0, 156 / 7 = 22.29.
  // ---------------------------------------------------------------------------------------------------------------------------------
  await go('m12-lab-grain:0'); await clean('grain lab');
  const GR = { order: [12, '13.0'], line: [19, '8.21'], store: [4, '39.0'], customer: [7, '22.29'] };
  for (const g of Object.keys(GR)) {
    await pick('gr-g', g);
    ok(same(await bigs(), [String(GR[g][0]), '156.00', String(GR[g][0]), GR[g][1]]), 'grain lab, ' + g + ': ' + GR[g][0] + ' rows, 156.00, average ' + GR[g][1] + ' (got ' + (await bigs()).join(' | ') + ')');
  }

  // ---------------------------------------------------------------------------------------------------------------------------------
  // Mission 13, the translator. The seven dialects that did not run say "not run". The three that ran say what happened. Worked out by hand
  // from the documented behaviour of each engine: try_cast of '12x' is NULL on DuckDB (same rows); PostgreSQL raises "invalid input syntax for
  // type integer"; SQLite casts '12x' to 12 (different rows). SQLite has no WEEK keyword, so the translated date_trunc fails.
  // ---------------------------------------------------------------------------------------------------------------------------------
  await go('m13-lab-translate:0'); await clean('translator');
  const QS = await chipVals('tr-q'), TS = await chipVals('tr-t');
  ok(QS.length === 9 && TS.length === 10, 'translator: nine queries and ten dialects');
  const RAN = ['duckdb', 'postgres', 'sqlite'];
  for (const q of QS) for (const t of TS) {
    await pick('tr-q', q); await pick('tr-t', t);
    const b = await bigs(), c = await cls();
    if (RAN.includes(t)) ok(['same rows', 'check'].includes(b[0]) && /^ran here: /.test((await caps())[0]), 'translator, ' + q + ' to ' + t + ': says what happened when it ran');
    else ok(b[0] === 'not run' && /^translated, not run/.test((await caps())[0]) && c[0] !== 'good', 'translator, ' + q + ' to ' + t + ': says "translated, not run"');
  }
  await pick('tr-q', 'trycast');
  await pick('tr-t', 'duckdb'); ok((await bigs())[0] === 'same rows', 'translator, try_cast on DuckDB: same rows');
  await pick('tr-t', 'postgres'); ok(/invalid input syntax for type integer: "12x"/.test((await caps())[0]), 'translator, try_cast on PostgreSQL: invalid input syntax for type integer');
  await pick('tr-t', 'sqlite'); ok(/DIFFERENT rows/.test((await caps())[0]) && /"12","12"/.test((await caps())[0]), 'translator, try_cast on SQLite: different rows, both values 12');
  await pick('tr-q', 'weekly'); await pick('tr-t', 'sqlite'); ok(/no such column: WEEK/.test((await caps())[0]), 'translator, weekly on SQLite: no such column WEEK');
  const SQL = {
    'top3|tsql': "SELECT\nTOP 3\n  order_id,\n  total\nFROM orders\nWHERE\n  status = 'paid'\nORDER BY\n  total DESC",
    'top3|oracle': "SELECT\n  order_id,\n  total\nFROM orders\nWHERE\n  status = 'paid'\nORDER BY\n  total DESC NULLS LAST\nFETCH FIRST 3 ROWS ONLY",
    'trycast|bigquery': "SELECT\n  SAFE_CAST('12x' AS INT64) AS bad_number,\n  SAFE_CAST('12' AS INT64) AS good_number",
    'trycast|postgres': "SELECT\n  CAST('12x' AS INT) AS bad_number,\n  CAST('12' AS INT) AS good_number",
    'trycast|mysql': "SELECT\n  CAST('12x' AS SIGNED) AS bad_number,\n  CAST('12' AS SIGNED) AS good_number",
    'ilike|mysql': "SELECT\n  order_id\nFROM orders\nWHERE\n  LOWER(channel) LIKE LOWER('W%')\nORDER BY\n  CASE WHEN order_id IS NULL THEN 1 ELSE 0 END, order_id"
  };
  for (const key of Object.keys(SQL)) {
    const [q, t] = key.split('|');
    await pick('tr-q', q); await pick('tr-t', t);
    const bx = await boxes();
    ok(bx.length === 2 && bx[1].split('\n').slice(1).join('\n') === SQL[key], 'translator, ' + q + ' to ' + t + ': the text that sqlglot writes');
  }

  // ---------------------------------------------------------------------------------------------------------------------------------
  // The diagrams. Every title and subtitle must fit inside its box. One planner node had a subtitle that was 5 units wider than its box,
  // and 14 labels of 106 nodes were too wide before they were shortened.
  // ---------------------------------------------------------------------------------------------------------------------------------
  const flows = await page.evaluate(() => LAB.chapters.flatMap(c => c.scenes).filter(s => s.type === 'flow').map(s => s.id));
  ok(flows.length === 13, 'diagrams: thirteen flow screens (got ' + flows.length + ')');
  let nodeCount = 0;
  for (const id of flows) {
    await go(id + ':0'); lab = 'diagram ' + id;
    const r = await page.evaluate(() => {
      const wide = []; let n = 0;
      document.querySelectorAll('svg.graph g').forEach(g => {
        const rect = g.querySelector(':scope > rect'), ts = g.querySelectorAll(':scope > text'); if (!rect || !ts.length) return;
        n++; const rw = rect.getBBox().width;
        ts.forEach(t => { if (t.getBBox().width > rw - 2) wide.push(t.textContent.slice(0, 30)); });
      });
      return { wide, n };
    });
    nodeCount += r.n;
    ok(r.n > 0 && r.wide.length === 0, 'diagram ' + id + ': every label fits its box (wider than the box: ' + r.wide.join(', ') + ')');
  }
  ok(nodeCount === 106, 'diagrams: 106 boxes measured (got ' + nodeCount + ')');

  ok(errs.length === 0, 'no page errors or console errors during the lab tests: ' + errs.slice(0, 3).join(' | '));
  console.log('e2e labs: ' + pass + ' passed, ' + fail + ' failed');
  await browser.close(); srv.close();
  process.exit(fail ? 1 : 0);
})();
