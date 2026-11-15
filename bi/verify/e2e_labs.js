// End-to-end test of the 6 labs of the BI course, in a real browser.
// It opens bi/index.html, clicks every chip of every lab, and compares what the page shows with
//   (a) what was recorded (bi/js/real.js), and
//   (b) values that are worked out in this file (sums of four orders, counts of queries, shares, rows of a refresh window).
// Nothing is read from the widget code. A lab that shows a wrong number or a stale label fails here, even when the data behind it passes
// verify/check_widgets.js. No step may show an HTML tag, backticks, asterisks, "undefined" or "NaN" as text.
// Needs Playwright:  npm install playwright && npx playwright install chromium
// Run: node bi/verify/e2e_labs.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + '\n   got  ' + JSON.stringify(a) + '\n   want ' + JSON.stringify(b));
const fmt = v => Number(v).toLocaleString('en-US', { minimumFractionDigits: Number(v) % 1 ? 2 : 0, maximumFractionDigits: 2 });
const cents = v => '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const sum = a => a.reduce((x, y) => x + y, 0);

(async () => {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end(); }
    res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.addInitScript(() => { try { localStorage.setItem('dep.bi.v1', JSON.stringify({ track: 'all', chosen: true })); } catch (e) { /* ignore */ } });
  await page.goto('http://127.0.0.1:' + srv.address().port + '/bi/index.html'); await page.waitForTimeout(300);

  const REAL = await page.evaluate(() => LAB.real), C = k => REAL.counts[k], T = k => REAL.tables[k];
  const sceneOf = kind => page.evaluate(k => { let f = null; LAB.chapters.forEach(c => c.scenes.forEach(s => { if (s.type === 'widget' && s.kind === k) f = s.id; })); return f; }, kind);
  const open = async kind => { const id = await sceneOf(kind); ok(!!id, 'the course has a lab of kind ' + kind); await page.evaluate(k => { location.hash = k + ':0'; }, id); await page.waitForTimeout(60); };
  const pick = async (act, v) => { await page.click('[data-act="' + act + '"][data-v="' + v + '"]'); await page.waitForTimeout(12); };
  const bigs = () => page.$$eval('.lab .big', els => els.map(e => [e.querySelector('b').textContent, e.querySelector('span').textContent, e.className.replace('big', '').trim()]));
  const tables = () => page.$$eval('.lab .tbl', ts => ts.map(t => [...t.querySelectorAll('tbody tr')].map(r => [...r.children].map(td => td.innerText.trim()))));
  const rowClasses = () => page.$$eval('.lab .tbl tbody tr', rs => rs.map(r => r.className));
  const chipOn = act => page.$$eval('[data-act="' + act + '"].on', els => els.map(e => e.getAttribute('data-v')));
  const chipVals = act => page.$$eval('[data-act="' + act + '"]', els => els.map(e => e.getAttribute('data-v')));
  const callouts = () => page.$$eval('.lab .callout', els => els.map(e => [e.className.replace('callout', '').trim(), e.innerText.replace(/\s+/g, ' ').trim()]));
  const lanes = () => page.$$eval('.lab .lane', els => els.map(l => [l.querySelector('.lane-n').textContent, l.querySelector('.lane-v').textContent, l.querySelector('i').className]));
  const noRaw = async where => { const t = await page.$eval('.lab', el => el.innerText); ok(!/[`]|\*\*|<\/?[a-z][a-z0-9]*[ >]|undefined|NaN|\[object Object\]/.test(t), where + ' shows no raw markup, undefined or NaN: ' + (t.match(/.{0,30}([`]|\*\*|<\/?[a-z][a-z0-9]*[ >]|undefined|NaN).{0,30}/) || [''])[0]); };
  const section = async (name, fn) => { try { await fn(); } catch (e) { fail++; console.log('FAIL:', name, 'threw', String(e.message).split('\n')[0]); } };

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 1: four orders. Fees 2.50, 4.00, 0.00, 2.50 and 2, 1, 2, 2 lines. Orders table: 4 rows, 9.00. Join: 7 rows, 14.00. Lines first: 4 rows, 9.00.
  await section('fanout lab', async () => {
    await open('fanout');
    eq(await chipVals('fo-w'), ['orders', 'join', 'pre'], 'fan-out lab: three ways');
    for (const [way, rows, total, kind, red] of [['orders', 4, 9, 'tip', 0], ['join', 7, 14, 'bad', 3], ['pre', 4, 9, 'good', 0]]) {
      await pick('fo-w', way);
      eq(await chipOn('fo-w'), [way], 'fan-out lab: ' + way + ' is selected');
      const b = await bigs(), t = (await tables())[0];
      eq([b[0][0], b[1][0], b[2][0]], [String(rows), cents(total), '$9.00'], 'fan-out lab, ' + way + ': rows, total and right answer');
      eq(b[1][2], total === 9 ? 'good' : 'bad', 'fan-out lab, ' + way + ': the total is marked ' + (total === 9 ? 'good' : 'bad'));
      eq(t.length, rows, 'fan-out lab, ' + way + ': rows in the table');
      eq(sum(t.map(r => parseFloat(r[2]))), total, 'fan-out lab, ' + way + ': the fees in the table add up to the total');
      eq((await rowClasses()).filter(c => c === 'dup').length, red, 'fan-out lab, ' + way + ': repeated rows are marked');
      eq((await callouts())[0][0], kind, 'fan-out lab, ' + way + ': kind of the callout');
      if (way === 'pre') eq(t.map(r => r[3]), ['84.00', '9.00', '51.50', '301.50'], 'fan-out lab: the lines of each order, summed by hand');
      await noRaw('fan-out lab, ' + way);
    }
    const F = C('model.fanout'), txt = await page.$eval('.lab-note', e => e.innerText);
    ok(txt.includes(fmt(F.orders)) && txt.includes('$' + fmt(F.shipping_right)) && txt.includes('$' + fmt(F.shipping_wrong)) && txt.includes(String(F.times_too_high)), 'fan-out lab: the note quotes the recorded totals');
  });

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 2: a copy or live. Live: viewers x 6 queries, viewers x 6 x fact rows. Copy: one refresh every N hours, fact rows / N in an average hour.
  await section('modes lab', async () => {
    await open('modes');
    const fact = C('perf.agg').fact_rows, tiles = C('perf.page').tiles;
    eq(tiles, 6, 'modes lab: the page has six tiles');
    for (const v of [5, 40, 200]) {
      await pick('mo-m', 'live'); await pick('mo-v', v);
      let b = await bigs();
      eq([b[0][0], b[1][0], b[2][0]], [fmt(v * 6), fmt(v * 6 * fact), 'the last load'], 'modes lab, live with ' + v + ' viewers: queries, rows and age');
      eq(b[0][2], v * 6 > 500 ? 'warn' : '', 'modes lab, live with ' + v + ' viewers: the warning appears above 500 queries');
      eq((await chipVals('mo-e')).length, 0, 'modes lab, live: no refresh setting is offered');
      await noRaw('modes lab, live ' + v);
      await pick('mo-m', 'copy');
      for (const e of [24, 4, 1]) {
        await pick('mo-e', e);
        b = await bigs();
        eq([b[0][0], b[1][0], b[2][0]], [e === 1 ? '1 refresh' : '1 refresh in ' + e + ' h', fmt(Math.round(fact / e)), 'up to ' + e + ' h'], 'modes lab, copy every ' + e + ' h with ' + v + ' viewers');
        eq(b[2][2], e >= 24 ? 'warn' : 'good', 'modes lab, copy every ' + e + ' h: the age is marked');
        const l = await lanes();
        eq([l[0][1], l[1][1]], [fmt(Math.round(fact / e)), fmt(v * 6 * fact)], 'modes lab: the two bars show the copy and the live load');
      }
      await noRaw('modes lab, copy ' + v);
    }
  });

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 3: 25 cells. Average = revenue / orders. Share = revenue of the cell / revenue of all regions in the same category.
  await section('context lab', async () => {
    await open('context');
    const L = T('measures.lab').rows, cell = (r, c) => L.find(x => x[0] === r && x[1] === c);
    eq(await chipVals('cx-r'), ['All', 'North', 'South', 'East', 'West'], 'context lab: regions');
    eq(await chipVals('cx-c'), ['All', 'Coffee', 'Tea', 'Equipment', 'Merch'], 'context lab: categories');
    for (const r of ['All', 'North', 'South', 'East', 'West']) for (const c of ['All', 'Coffee', 'Tea', 'Equipment', 'Merch']) {
      await pick('cx-r', r); await pick('cx-c', c);
      const x = cell(r, c), all = cell('All', c), t = (await tables())[0];
      eq(t.map(q => q[1]), ['$' + fmt(x[2]), fmt(x[3]), '$' + fmt((x[2] / x[3]).toFixed(2)), fmt(x[4]), '$' + fmt(all[2]), (x[2] / all[2] * 100).toFixed(1) + ' %'], 'context lab, ' + r + ' and ' + c + ': the six measures');
      if (r === 'All') eq(t[5][1], '100.0 %', 'context lab, all regions and ' + c + ': the share is 100');
    }
    await pick('cx-r', 'North'); await pick('cx-c', 'All');
    eq((await tables())[0][5][1], T('measures.share').rows.find(q => q[0] === 'North')[3].toFixed(1) + ' %', 'context lab: the share of North is the recorded share');
    await noRaw('context lab');
  });

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 4: fifteen months, the last twelve kept. The refund sits in 2025-11, the fifth month from the end. A window of 1 or 2 misses it, 6 reaches it.
  await section('refresh lab', async () => {
    await open('refresh');
    const P = T('refresh.partitions').rows, R = C('refresh.policy'), full = sum(P.map(r => r[1])), changed = P.filter(r => r[4] > 0).map(r => r[0]);
    eq(changed, ['2025-11', '2026-03'], 'refresh lab: the months with a change today');
    for (const win of [1, 2, 6]) for (const also of ['off', 'on']) {
      await pick('rf-w', win); await pick('rf-a', also);
      const inWin = P.slice(-win).map(r => r[0]), reloaded = P.filter(r => inWin.includes(r[0]) || (also === 'on' && changed.includes(r[0]))), stale = !reloaded.some(r => r[0] === '2025-11');
      const parts = await page.$$eval('.lab .part', els => els.map(e => [e.childNodes[0].textContent, e.querySelector('small').textContent, e.className.replace('part', '').trim()]));
      eq(parts.length, 15, 'refresh lab: fifteen partitions');
      eq(parts.filter(p => p[1] === 'dropped').map(p => p[0]), ['2025-01', '2025-02', '2025-03'], 'refresh lab: the three oldest months are dropped');
      eq(parts.filter(p => p[1] === 'reloaded').map(p => p[0]), reloaded.map(r => r[0]), 'refresh lab, window ' + win + ', second rule ' + also + ': the reloaded months');
      eq(parts.filter(p => p[1] === 'out of date').map(p => p[0]), stale ? ['2025-11'] : [], 'refresh lab, window ' + win + ', second rule ' + also + ': the month that is out of date');
      const rows = sum(reloaded.map(r => r[1])), b = await bigs();
      eq([b[0][0], b[1][0], b[2][0]], [fmt(rows), (rows / full * 100).toFixed(1) + ' %', stale ? '$56.00' : 'none'], 'refresh lab, window ' + win + ', second rule ' + also + ': rows, share and difference');
      eq((await callouts())[0][0], stale ? 'bad' : 'good', 'refresh lab, window ' + win + ', second rule ' + also + ': kind of the callout');
      if (win === 2 && also === 'off') eq([rows, (rows / full * 100).toFixed(1)], [R.rows_incremental_refresh, String(R.percent_of_full)], 'refresh lab: the recorded setting shows the recorded rows');
      if (win === 2 && also === 'on') eq(rows, R.rows_incremental_refresh + P.find(r => r[0] === '2025-11')[1], 'refresh lab: the second rule adds the rows of November');
      await noRaw('refresh lab ' + win + ' ' + also);
    }
    eq(R.late_order_amount, 56, 'refresh lab: the late refund is 56.00');
  });

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 5: six tiles. Tiles 3 and 4 (products, customers) need the fact. With the aggregate: 4 x aggregate rows + 2 x fact rows. Without: 6 x fact rows.
  await section('aggregate lab', async () => {
    await open('agg');
    const A = C('perf.agg'), PG = T('perf.page').rows, needFact = [false, false, false, true, true, false];
    eq(PG.map(r => r[1] === 'fact_order_lines'), needFact, 'aggregate lab: which tiles need the fact, as recorded');
    for (const has of ['yes', 'no']) for (let k = 0; k < 6; k++) {
      await pick('ag-h', has); await pick('ag-t', k);
      const onFact = has === 'no' || needFact[k], b = await bigs(), total = has === 'no' ? 6 * A.fact_rows : 4 * A.agg_rows + 2 * A.fact_rows;
      eq([b[0][0], b[1][0], b[2][0]], [onFact ? 'fact_order_lines' : 'agg_day_store_category', fmt(onFact ? A.fact_rows : A.agg_rows), fmt(total)], 'aggregate lab, aggregate ' + has + ', tile ' + k + ': table, rows and page total');
      const l = await lanes();
      eq(l.map(x => x[1]), needFact.map(nf => fmt(has === 'no' || nf ? A.fact_rows : A.agg_rows)), 'aggregate lab, aggregate ' + has + ': the six bars');
      eq(l.map(x => x[0]), PG.map(r => r[0]), 'aggregate lab: the bars are named after the tiles');
      eq((await callouts())[0][0], has === 'no' ? 'bad' : onFact ? 'warn' : 'good', 'aggregate lab, aggregate ' + has + ', tile ' + k + ': kind of the callout');
    }
    eq(4 * A.agg_rows + 2 * A.fact_rows, C('perf.page').rows_read_with_aggregate, 'aggregate lab: the page total with the aggregate is the recorded one');
    await noRaw('aggregate lab');
  });

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 6: five people. ana North, ben South, cho East and West, dee everything, eli nothing.
  await section('row-level security lab', async () => {
    await open('rls');
    const BR = {}; T('rls.by_region').rows.forEach(r => { BR[r[0]] = r[1]; });
    const want = { ana: ['North'], ben: ['South'], cho: ['East', 'West'], dee: ['East', 'North', 'South', 'West'], eli: [] };
    eq(await chipVals('rl-u'), ['ana', 'ben', 'cho', 'dee', 'eli'], 'security lab: five people');
    for (const u of Object.keys(want)) {
      await pick('rl-u', u);
      const t = (await tables())[0], b = await bigs(), rev = sum(want[u].map(g => BR[g]));
      eq(t.filter(r => r[2] === 'sees it').map(r => r[0]).sort(), want[u].slice().sort(), 'security lab, ' + u + ': the regions that are visible');
      eq(b[2][0], '$' + fmt(rev), 'security lab, ' + u + ': the revenue on the tile is the sum of the visible regions');
      eq(b[2][2], u === 'eli' ? 'bad' : '', 'security lab, ' + u + ': an empty tile is marked');
      eq((await callouts())[0][0], u === 'eli' ? 'warn' : 'tip', 'security lab, ' + u + ': kind of the callout');
      await noRaw('security lab, ' + u);
    }
  });

  eq(errs, [], 'no page errors while the labs were driven');
  await browser.close(); srv.close();
  console.log(fail ? pass + ' checks passed, ' + fail + ' FAILED' : pass + ' checks passed');
  process.exit(fail ? 1 : 0);
})();
