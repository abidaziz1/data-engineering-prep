// End-to-end test of the 3 labs of the MongoDB course, in a real browser.
// It opens mongodb/index.html, clicks every chip of every lab, and compares what the page shows with
//   (a) what was recorded (mongodb/js/real.js), and
//   (b) values that are worked out in this file: the orders rebuilt from the rule that made them (documents after each stage, the revenue of each SKU, store and region), the plan that
//       each index query must have, and the result that the rules of the validator give for each payment.
// Nothing is read from the widget code. A lab that shows a wrong number, a wrong colour or a stale label fails here, even when the data behind it passes verify/check_widgets.js.
// No step may show an HTML tag, backticks, asterisks, "undefined" or "NaN" as text.
// Needs Playwright:  npm install playwright && npx playwright install chromium
// Run: node mongodb/verify/e2e_labs.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + '\n   got  ' + JSON.stringify(a) + '\n   want ' + JSON.stringify(b));
const n = v => Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 });

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
  await page.addInitScript(() => { try { localStorage.setItem('dep.mongodb.v1', JSON.stringify({ track: 'all', chosen: true })); } catch (e) { /* ignore */ } });
  await page.goto('http://127.0.0.1:' + srv.address().port + '/mongodb/index.html'); await page.waitForTimeout(300);

  const REAL = await page.evaluate(() => LAB.real), C = k => REAL.counts[k], X = k => REAL.text[k];
  const sceneOf = kind => page.evaluate(k => { let f = null; LAB.chapters.forEach(c => c.scenes.forEach(s => { if (s.type === 'widget' && s.kind === k) f = s.id; })); return f; }, kind);
  const open = async kind => { const id = await sceneOf(kind); ok(!!id, 'the course has a lab of kind ' + kind); await page.evaluate(k => { location.hash = k + ':0'; }, id); await page.waitForTimeout(150); };
  const pick = async (act, v) => { await page.click('[data-act="' + act + '"][data-v="' + v + '"]'); await page.waitForTimeout(12); };
  const bigs = () => page.$$eval('.lab .big', els => els.map(e => [e.querySelector('b').textContent, e.querySelector('span').textContent, [...e.classList].filter(c => c !== 'big' && c !== 'long').join(' ')]));
  const chipOn = act => page.$$eval('[data-act="' + act + '"].on', els => els.map(e => e.getAttribute('data-v')));
  const chipVals = act => page.$$eval('[data-act="' + act + '"]', els => els.map(e => e.getAttribute('data-v')));
  const chipTexts = act => page.$$eval('[data-act="' + act + '"]', els => els.map(e => e.innerText.trim()));
  const callouts = () => page.$$eval('.lab .callout', els => els.map(e => [e.className.replace('callout', '').trim(), e.innerText.replace(/\s+/g, ' ').trim()]));
  const lanes = () => page.$$eval('.lab .lane', els => els.map(l => [l.querySelector('.lane-n').textContent, l.querySelector('.lane-v').textContent, l.querySelector('i').className.trim(), l.querySelector('i').getAttribute('style')]));
  const pres = () => page.$$eval('.lab .lab-pre', els => els.map(e => [e.className.replace('lab-pre', '').trim(), e.textContent]));
  const notes = () => page.$eval('.lab .lab-note', e => e.innerText.replace(/\s+/g, ' ').trim());
  const tables = () => page.$$eval('.lab .tbl', ts => ts.map(t => [...t.querySelectorAll('tbody tr')].map(r => [...r.children].map(td => td.innerText.trim()))));
  const heads = () => page.$$eval('.lab .tbl', ts => ts.map(t => [...t.querySelectorAll('thead th')].map(th => th.innerText.trim())));
  const pills = () => page.$$eval('.lab .lab-note .pill', els => els.map(e => e.innerText.trim().toLowerCase()));      // the style sheet prints them in capitals
  const noRaw = async where => { const t = await page.$eval('.lab', el => el.innerText); ok(!/[`]|\*\*|<\/?[a-z][a-z0-9]*[ >]|undefined|NaN|\[object Object\]/.test(t), where + ' shows no raw markup, undefined or NaN: ' + t.slice(0, 80)); };
  const width = l => +/width:([\d.]+)%/.exec(l[3])[1];
  const section = async (name, fn) => { try { await fn(); } catch (e) { fail++; console.log('FAIL:', name, 'threw', String(e.message).split('\n')[0]); } };
  const colour = exit => (exit ? 'bad' : 'good');

  const SKUS = [['MUG', 900], ['BEANS-250', 1800], ['FILTER', 350], ['GRINDER', 4900]], REGIONS = ['north', 'south', 'east'], NN = 20000;
  const orders = []; for (let i = 1; i <= NN; i++) { const lines = []; for (let k = 0; k < 1 + i % 3; k++) lines.push({ sku: SKUS[(i + k) % 4][0], qty: 1 + (i + k) % 3, cents: SKUS[(i + k) % 4][1] }); orders.push({ i, store: 1 + (i * 7) % 12, status: i % 25 === 0 ? 'REFUNDED' : i % 7 === 0 ? 'SHIPPED' : 'PLACED', lines, total: lines.reduce((a, l) => a + l.qty * l.cents, 0) }); }
  const live = orders.filter(o => o.status !== 'REFUNDED');

  // lab 1: three pipelines
  await section('pipeline lab', async () => {
    await open('pipelab');
    const afterMatch = live.length, afterUnwind = live.reduce((a, o) => a + o.lines.length, 0);
    const byStore = {}; live.forEach(o => { const r = byStore[o.store] || (byStore[o.store] = [0, 0]); r[0]++; r[1] += o.total; });
    const byRegion = {}; Object.keys(byStore).forEach(s => { const g = REGIONS[s % 3], r = byRegion[g] || (byRegion[g] = [0, 0]); r[0] += byStore[s][0]; r[1] += byStore[s][1]; });
    const bySku = {}; live.forEach(o => o.lines.forEach(l => { const r = bySku[l.sku] || (bySku[l.sku] = [0, 0]); r[0] += l.qty; r[1] += l.qty * l.cents; }));
    const cases = [
      { name: 'revenue by SKU', kind: 'tip', nums: [[n(afterMatch), 'documents after $match'], [n(afterUnwind), 'after $unwind'], ['4', 'after $group']], head: ['sku', 'units', 'revenue'], rows: Object.keys(bySku).sort().map(k => [k, n(bySku[k][0]), n(bySku[k][1])]), has: ['one document for each line'] },
      { name: 'revenue by store', kind: 'tip', nums: [[n(byStore[1][0]), 'orders of store 1'], ['3', 'stores shown (the first three)']], head: ['store', 'orders', 'revenue'], rows: [1, 2, 3].map(s => [String(s), n(byStore[s][0]), n(byStore[s][1])]), has: ['refunded orders were left out'] },
      { name: 'revenue by region, with $lookup', kind: 'warn', nums: [['3', 'regions'], [n(byRegion.east[0]), 'orders in a region']], head: ['region', 'orders', 'revenue'], rows: Object.keys(byRegion).sort().map(g => [g, n(byRegion[g][0]), n(byRegion[g][1])]), has: ['Group by store **first**'.replace(/\*/g, '')] }
    ];
    eq(await chipTexts('pl-k'), cases.map(c => c.name), 'pipeline lab: the chips name the three pipelines');
    for (let k = 0; k < cases.length; k++) {
      await pick('pl-k', String(k));
      const c = cases[k], b = await bigs(), t = (await tables())[0], h = (await heads())[0], co = (await callouts())[0];
      eq(await chipOn('pl-k'), [String(k)], 'pipeline lab, ' + c.name + ': it is selected');
      eq(b.map(x => [x[0], x[1]]), c.nums, 'pipeline lab, ' + c.name + ': the numbers and their labels');
      eq(h, c.head, 'pipeline lab, ' + c.name + ': the columns of the table');
      eq(t, c.rows, 'pipeline lab, ' + c.name + ': the rows that the rules give');
      eq(co[0], c.kind, 'pipeline lab, ' + c.name + ': the colour of the callout');
      c.has.forEach(w => ok(co[1].includes(w), 'pipeline lab, ' + c.name + ': the callout says "' + w + '": ' + co[1].slice(0, 120)));
      await noRaw('pipeline lab, ' + c.name);
    }
    eq(await pills(), ['recorded'], 'pipeline lab: the note says that the output is recorded');
  });

  // lab 2: five index queries
  await section('index lab', async () => {
    await open('indexlab');
    const q1 = orders.filter(o => o.store === 3 && o.status === 'REFUNDED').length, q3 = orders.filter(o => o.store === 3 && o.status === 'PLACED').length;
    const cases = [
      { name: '1. no index', plan: 'COLLSCAN', docs: NN, ret: q1, kind: 'bad', bar: 'bad', has: ['every document'] },
      { name: '2. index (store_id, status)', plan: 'FETCH > IXSCAN', docs: q1, ret: q1, kind: 'good', bar: 'good', has: ['only the matching keys'] },
      { name: '3. same index, sorted by placed_at', plan: 'SORT > FETCH > IXSCAN', docs: q3, ret: q3, kind: 'warn', bar: 'bad', has: ['in memory'] },
      { name: '4. index (store_id, status, placed_at)', plan: 'FETCH > IXSCAN', docs: q3, ret: q3, kind: 'good', bar: 'bad', has: ['gone'] },
      { name: '5. only the fields of the index', plan: 'PROJECTION_COVERED > IXSCAN', docs: 0, ret: q1, kind: 'good', bar: 'good', has: ['covered'] }
    ];
    eq(await chipTexts('il-k'), cases.map(c => c.name), 'index lab: the chips name the five cases');
    for (let k = 0; k < cases.length; k++) {
      await pick('il-k', String(k));
      const c = cases[k], b = await bigs(), L = await lanes(), co = (await callouts())[0];
      eq(b.map(x => [x[0], x[1]]), [[c.plan, 'the plan'], [n(c.docs), 'documents examined'], [n(c.ret), 'documents returned']], 'index lab, ' + c.name + ': the plan and the numbers');
      eq(b.map(x => x[2]), [c.kind === 'warn' ? 'warn' : c.kind === 'bad' ? 'bad' : 'good', c.docs > 1000 ? 'bad' : 'good', ''], 'index lab, ' + c.name + ': the colours');
      eq([L[0][0], L[0][1], L[0][2]], ['documents examined', n(c.docs) + ' of ' + n(NN), c.docs > 1000 ? 'bad' : 'good'], 'index lab, ' + c.name + ': the bar and its colour');
      ok(Math.abs(width(L[0]) - Math.max(1, Math.min(100, c.docs / NN * 100))) < 0.01, 'index lab, ' + c.name + ': the bar is in proportion to 20,000: ' + width(L[0]));
      eq(co[0], c.kind === 'bad' ? 'bad' : c.kind === 'warn' ? 'warn' : 'good', 'index lab, ' + c.name + ': the colour of the callout');
      c.has.forEach(w => ok(co[1].includes(w), 'index lab, ' + c.name + ': the callout says "' + w + '": ' + co[1].slice(0, 120)));
      await noRaw('index lab, ' + c.name);
    }
    eq(await pills(), ['recorded'], 'index lab: the note says that the output is recorded');
  });

  // lab 3: writes
  await section('write lab', async () => {
    await open('writelab');
    const valid = d => Number.isInteger(d.amount) && d.amount >= 0 && ['USD', 'EUR', 'GBP'].includes(d.currency);
    const cases = [
      { name: 'a valid payment', kind: 'good', nums: [['inserted', 'the result']], cls: ['good'], has: ['accepted'] },
      { name: 'amount as text', kind: 'bad', nums: [['code 121', 'the error code']], cls: ['bad'], has: ['does not convert'] },
      { name: 'unknown currency', kind: 'bad', nums: [['code 121', 'the error code']], cls: ['bad'], has: ['every writer'] },
      { name: 'same order again', kind: 'warn', nums: [['code 11000', 'the error code']], cls: [''], has: ['unique index'] },
      { name: 'upsert, run twice', kind: 'good', nums: [['3 / 0 / 0', 'upserted / matched / modified, run 1'], ['0 / 3 / 0', 'run 2']], cls: ['good', ''], has: ['safe to repeat'] },
      { name: 'transaction, aborted', kind: 'tip', nums: [['1 / 0', 'inside / outside the transaction'], ['0 / 1', 'after abort / after commit']], cls: ['', ''], has: ['replica set'] }
    ];
    ok(!valid({ amount: '12.50', currency: 'USD' }) && !valid({ amount: 100, currency: 'XXX' }) && valid({ amount: 1250, currency: 'USD' }), 'write lab: the rules of the validator refuse the two payments that the lab shows as refused');
    eq(await chipTexts('wl-k'), cases.map(c => c.name), 'write lab: the chips name the six writes');
    eq(await chipOn('wl-k'), ['1'], 'write lab: it opens on the text amount');
    for (let k = 0; k < cases.length; k++) {
      await pick('wl-k', String(k));
      const c = cases[k], b = await bigs(), co = (await callouts())[0], p = await pres();
      eq(b.map(x => [x[0], x[1]]), c.nums, 'write lab, ' + c.name + ': the numbers and their labels');
      eq(b.map(x => x[2]), c.cls, 'write lab, ' + c.name + ': the colours');
      eq(co[0], c.kind, 'write lab, ' + c.name + ': the colour of the callout');
      eq(p[0][0], c.kind === 'bad' || c.kind === 'warn' ? 'err' : '', 'write lab, ' + c.name + ': a refusal is shown as an error');
      c.has.forEach(w => ok(co[1].includes(w), 'write lab, ' + c.name + ': the callout says "' + w + '": ' + co[1].slice(0, 120)));
      await noRaw('write lab, ' + c.name);
    }
    eq(await pills(), ['recorded'], 'write lab: the note says that the output is recorded');
  });

  ok(errs.length === 0, 'no console or page errors: ' + errs.slice(0, 3).join(' | '));
  await browser.close(); srv.close();
  console.log(fail ? fail + ' lab checks FAILED, ' + pass + ' passed' : pass + ' lab checks passed');
  process.exit(fail ? 1 : 0);
})();
