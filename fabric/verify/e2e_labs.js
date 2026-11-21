// End-to-end test of the 6 labs of the Microsoft Fabric course, in a real browser.
// It opens fabric/index.html, clicks every chip of every lab, and compares what the page shows with
//   (a) what was recorded (fabric/js/real.js), and
//   (b) values that are worked out in this file: the files of a table after each commit, the colour that follows from a number, the Spark cores of a capacity size, and the
//       throttling stage that follows from the minutes of future capacity.
// Nothing is read from the widget code. A lab that shows a wrong number or a stale label fails here, even when the data behind it passes verify/check_widgets.js.
// No step may show an HTML tag, backticks, asterisks, "undefined" or "NaN" as text.
// Needs Playwright:  npm install playwright && npx playwright install chromium
// Run: node fabric/verify/e2e_labs.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + '\n   got  ' + JSON.stringify(a) + '\n   want ' + JSON.stringify(b));
const n = v => Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 });
const kb = x => (x >= 1048576 ? (x / 1048576).toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' MB' : x >= 1024 ? (x / 1024).toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' kB' : n(x) + ' bytes');

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
  await page.addInitScript(() => { try { localStorage.setItem('dep.fabric.v1', JSON.stringify({ track: 'all', chosen: true })); } catch (e) { /* ignore */ } });
  await page.goto('http://127.0.0.1:' + srv.address().port + '/fabric/index.html'); await page.waitForTimeout(300);

  const REAL = await page.evaluate(() => LAB.real), C = k => REAL.counts[k], T = k => REAL.tables[k];
  const sceneOf = kind => page.evaluate(k => { let f = null; LAB.chapters.forEach(c => c.scenes.forEach(s => { if (s.type === 'widget' && s.kind === k) f = s.id; })); return f; }, kind);
  const open = async kind => { const id = await sceneOf(kind); ok(!!id, 'the course has a lab of kind ' + kind); await page.evaluate(k => { location.hash = k + ':0'; }, id); await page.waitForTimeout(60); };
  const pick = async (act, v) => { await page.click('[data-act="' + act + '"][data-v="' + v + '"]'); await page.waitForTimeout(12); };
  const bigs = () => page.$$eval('.lab .big', els => els.map(e => [e.querySelector('b').textContent, e.querySelector('span').textContent, e.className.replace('big', '').trim()]));
  const tables = () => page.$$eval('.lab .tbl', ts => ts.map(t => [...t.querySelectorAll('tbody tr')].map(r => [...r.children].map(td => td.innerText.trim()))));
  const heads = () => page.$$eval('.lab .tbl', ts => ts.map(t => [...t.querySelectorAll('thead th')].map(th => th.innerText.trim())));
  const rowCls = () => page.$$eval('.lab .tbl tbody tr', trs => trs.map(r => r.className.trim()));
  const chipOn = act => page.$$eval('[data-act="' + act + '"].on', els => els.map(e => e.getAttribute('data-v')));
  const chipVals = act => page.$$eval('[data-act="' + act + '"]', els => els.map(e => e.getAttribute('data-v')));
  const chipTexts = act => page.$$eval('[data-act="' + act + '"]', els => els.map(e => e.innerText.trim()));
  const callouts = () => page.$$eval('.lab .callout', els => els.map(e => [e.className.replace('callout', '').trim(), e.innerText.replace(/\s+/g, ' ').trim()]));
  const lanes = () => page.$$eval('.lab .lane', els => els.map(l => [l.querySelector('.lane-n').textContent, l.querySelector('.lane-v').textContent, l.querySelector('i').className.trim(), l.querySelector('i').getAttribute('style')]));
  const notes = () => page.$eval('.lab .lab-note', e => e.innerText.replace(/\s+/g, ' ').trim());
  const pills = () => page.$$eval('.lab .lab-note .pill', els => els.map(e => e.innerText.trim().toLowerCase()));      // the style sheet prints them in capitals
  const noRaw = async where => { const t = await page.$eval('.lab', el => el.innerText); ok(!/[`]|\*\*|<\/?[a-z][a-z0-9]*[ >]|undefined|NaN|\[object Object\]/.test(t), where + ' shows no raw markup, undefined or NaN: ' + (t.match(/.{0,30}([`]|\*\*|<\/?[a-z][a-z0-9]*[ >]|undefined|NaN|\[object Object\]).{0,30}/) || [''])[0]); };
  const width = l => +/width:([\d.]+)%/.exec(l[3])[1];
  const section = async (name, fn) => { try { await fn(); } catch (e) { fail++; console.log('FAIL:', name, 'threw', String(e.message).split('\n')[0]); } };

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 1: the log of a table
  await section('log lab', async () => {
    await open('loglab');
    const h = T('bronze.history').rows, tt = T('bronze.timetravel').rows, maxR = tt[tt.length - 1][1];
    eq(await chipVals('ll-k'), h.map((r, i) => String(i)), 'log lab: one chip for each of the five versions');
    eq(await chipTexts('ll-k'), h.map((r, i) => 'version ' + i), 'log lab: the chips say which version');
    let files = 0;
    for (let k = 0; k < h.length; k++) {
      files += h[k][2];
      await pick('ll-k', String(k));
      eq(await chipOn('ll-k'), [String(k)], 'log lab: version ' + k + ' is selected');
      const b = await bigs();
      eq(b.map(x => x[0]), [String(k), String(files), n(h[k][3]), n(tt[k][1])], 'log lab, version ' + k + ': the four numbers');
      eq(b.map(x => x[1]), ['version', 'files in the table', 'rows written by this commit', 'rows at this version'], 'log lab: the four labels');
      eq(b[1][2], files > 3 ? 'warn' : 'good', 'log lab, version ' + k + ': the colour of the files follows the number');
      const L = await lanes();
      eq([L[0][1], L[0][2]], [n(tt[k][1]), 'good'], 'log lab, version ' + k + ': the bar of the rows');
      ok(Math.abs(width(L[0]) - tt[k][1] / maxR * 100) < 0.01, 'log lab, version ' + k + ': the bar is in proportion: ' + width(L[0]));
      const t = (await tables())[0];
      eq(t, h.map((r, q) => [String(r[0]), r[1], String(r[2]), n(r[3]), n(tt[q][1])]), 'log lab, version ' + k + ': the table of the five commits');
      eq((await rowCls()).map((c, q) => (c.includes('new') ? q : -1)).filter(q => q >= 0), [k], 'log lab, version ' + k + ': one row is marked');
      eq((await callouts())[0][0], k === 3 ? 'warn' : 'tip', 'log lab, version ' + k + ': the colour of the callout');
      eq(await pills(), ['recorded'], 'log lab: the note says that the numbers are recorded');
      await noRaw('log lab, version ' + k);
    }
    const c3 = await (async () => { await pick('ll-k', '3'); return (await callouts())[0][1]; })();
    ok(/duplicates/.test(c3), 'log lab: the callout of version 3 says that the table has duplicates: ' + c3);
  });

  // lab 2: eight runs of a merge
  await section('merge lab', async () => {
    await open('mergelab');
    const t = T('silver.merge_runs'), rows = t.rows;
    eq(await chipTexts('ml-k'), rows.map(r => r[0]), 'merge lab: the chips carry the names of the runs');
    for (let k = 0; k < rows.length; k++) {
      await pick('ml-k', String(k));
      const r = rows[k], replay = /replayed/.test(r[0]), again = /again/.test(r[0]);
      const b = await bigs();
      eq(b.map(x => x[0]), [n(r[1]), n(r[2]), n(r[3]), n(r[5]), n(r[7]), n(r[8])], 'merge lab, ' + r[0] + ': the six numbers');
      eq(b.map(x => x[1]), ['lines in the file', 'inserted', 'updated', 'rows in the table', 'cancelled orders', 'files written'], 'merge lab: the six labels');
      eq(b.map(x => x[2]), [r[2] ? '' : '', r[2] ? 'good' : '', r[3] ? (replay ? 'bad' : 'warn') : 'good', '', replay ? 'bad' : '', r[8] ? '' : 'good'].map((c, i) => (i === 0 ? '' : c)), 'merge lab, ' + r[0] + ': the colours follow the numbers');
      const T0 = (await tables())[0], H0 = (await heads())[0];
      eq(H0, [0, 2, 3, 4, 5, 7, 8].map(q => t.cols[q]), 'merge lab: the table has the recorded columns that the numbers above do not show');
      eq(T0, rows.map(x => [x[0], n(x[2]), n(x[3]), String(x[4]), n(x[5]), n(x[7]), String(x[8])]), 'merge lab, ' + r[0] + ': the table of the eight runs');
      eq((await callouts())[0][0], replay && r[3] > 0 ? 'bad' : again ? 'good' : 'tip', 'merge lab, ' + r[0] + ': the colour of the callout');
      const txt = (await callouts())[0][1];
      if (replay) ok(txt.includes('older') && txt.includes(String(r[3])) && txt.includes('replay'), 'merge lab, ' + r[0] + ': the callout says that the file is older and that rows were reverted: ' + txt);
      if (again) ok(txt.includes('No row changed') && txt.includes('rewrote ' + r[8]), 'merge lab, ' + r[0] + ': the callout says that no row changed and that files were rewritten: ' + txt);
      await noRaw('merge lab, ' + r[0]);
    }
    eq(await pills(), ['recorded'], 'merge lab: the note says that the numbers are recorded');
  });

  // lab 3: small files, OPTIMIZE and VACUUM
  await section('files lab', async () => {
    await open('fileslab');
    const rows = T('files.lifecycle').rows, TE = C('files.timetravel_error');
    eq((await chipTexts('fl-k')).map(t => t.replace(/^\d+\. /, '')), rows.map(r => r[0]), 'files lab: the chips carry the names of the three steps');
    for (let k = 0; k < rows.length; k++) {
      await pick('fl-k', String(k));
      const r = rows[k], can = k < 2, L = await lanes(), b = await bigs();
      eq(L.map(l => l[1]), [n(r[1]), n(r[2])], 'files lab, step ' + (k + 1) + ': the two bars');
      eq(L.map(l => l[2]), [r[1] > 10 ? 'bad' : 'good', r[2] > 10 ? 'warn' : 'good'], 'files lab, step ' + (k + 1) + ': the colours of the bars');
      ok(Math.abs(width(L[0]) - Math.max(1, Math.min(100, r[1] / 40 * 100))) < 0.01 && Math.abs(width(L[1]) - Math.max(1, Math.min(100, r[2] / 41 * 100))) < 0.01, 'files lab, step ' + (k + 1) + ': the bars are in proportion');
      eq(b.map(x => x[0]), [n(r[1]), n(r[2]), can ? 'works' : 'fails'], 'files lab, step ' + (k + 1) + ': the three numbers');
      eq(b.map(x => x[2]), [r[1] > 10 ? 'bad' : 'good', r[2] > 10 ? 'warn' : 'good', can ? 'good' : 'bad'], 'files lab, step ' + (k + 1) + ': the colours of the numbers');
      eq((await callouts())[0][0], k === 2 ? 'bad' : k === 1 ? 'tip' : 'warn', 'files lab, step ' + (k + 1) + ': the colour of the callout');
      if (k === 2) ok((await callouts())[0][1].includes(TE.condition), 'files lab: the last callout names the error of the recording: ' + TE.condition);
      await noRaw('files lab, step ' + (k + 1));
    }
  });

  // lab 4: partition by what
  await section('partition lab', async () => {
    await open('partlab');
    const rows = T('partition.layout').rows, maxF = Math.max(...rows.map(r => r[2])), maxB = Math.max(...rows.map(r => r[3]));
    eq(await chipTexts('pl-k'), rows.map(r => r[0]), 'partition lab: the chips carry the four layouts');
    for (let k = 0; k < rows.length; k++) {
      await pick('pl-k', String(k));
      const r = rows[k], per = Math.round(10000 / r[2]), L = await lanes(), b = await bigs();
      eq(L.map(l => l[1]), [n(r[2]), kb(r[3])], 'partition lab, ' + r[0] + ': the two bars');
      eq(L.map(l => l[2]), [r[2] > 100 ? 'bad' : r[2] > 5 ? 'warn' : 'good', r[3] > 500000 ? 'warn' : 'good'], 'partition lab, ' + r[0] + ': the colours of the bars');
      const prop = (v, m) => Math.max(1, Math.min(100, v / m * 100));      // a bar is never narrower than 1 %
      ok(Math.abs(width(L[0]) - prop(r[2], maxF)) < 0.01 && Math.abs(width(L[1]) - prop(r[3], maxB)) < 0.01, 'partition lab, ' + r[0] + ': the bars are in proportion (' + width(L[0]) + ' and ' + width(L[1]) + ')');
      eq(b.map(x => x[0]), [n(r[1]), n(r[2]), kb(r[4]), n(per)], 'partition lab, ' + r[0] + ': the four numbers');
      eq(b.map(x => x[2]), ['', r[2] > 100 ? 'bad' : '', r[4] < 5000 ? 'bad' : 'good', per < 100 ? 'bad' : 'good'], 'partition lab, ' + r[0] + ': the colours of the numbers');
      eq((await callouts())[0][0], k === 3 ? 'bad' : k === 1 ? 'good' : 'tip', 'partition lab, ' + r[0] + ': the colour of the callout');
      if (k === 1) ok((await callouts())[0][1].includes('PartitionFilters'), 'partition lab: the date callout names the partition filter');
      if (k === 3) ok((await callouts())[0][1].includes('400 files') && (await callouts())[0][1].includes('25 rows'), 'partition lab: the customer callout says 400 files of about 25 rows');
      await noRaw('partition lab, ' + r[0]);
    }
  });

  // lab 5: two readers of one gold table
  await section('framing lab', async () => {
    await open('framelab');
    const rows = T('gold.pinned').rows, P = C('gold.pinned');
    eq(await chipTexts('fr-k'), rows.map(r => r[0]), 'framing lab: the chips name the two readers');
    for (let k = 0; k < rows.length; k++) {
      await pick('fr-k', String(k));
      const r = rows[k], b = await bigs(), L = await lanes();
      eq(b.map(x => x[0]), [String(r[1]), r[2], String(r[3]), n(+r[4])], 'framing lab, ' + r[0] + ': the four numbers');
      eq(b.map(x => x[2]), [k ? 'good' : 'warn', k ? 'good' : 'warn', '', ''], 'framing lab, ' + r[0] + ': the colours');
      ok(Math.abs(width(L[0]) - +r[4] / P.revenue_latest * 100) < 0.01, 'framing lab, ' + r[0] + ': the bar of the revenue is in proportion');
      eq([L[0][1], L[0][2]], [n(+r[4]), k ? 'good' : 'warn'], 'framing lab, ' + r[0] + ': the value and the colour of the revenue bar');
      eq((await callouts())[0][0], k ? 'good' : 'warn', 'framing lab, ' + r[0] + ': the colour of the callout');
      await noRaw('framing lab, ' + r[0]);
    }
    await pick('fr-k', '1');
    ok((await callouts())[0][1].includes(n(P.revenue_latest - P.revenue_pinned)), 'framing lab: the latest reader says how much more revenue it shows');
    eq(await pills(), ['recorded', 'from documentation'], 'framing lab: the notes say that the reads are recorded and that the model is from documentation');
  });

  // lab 6: capacity (from documentation)
  await section('capacity lab', async () => {
    await open('capacitylab');
    const SKU = [['F2', 2], ['F8', 8], ['F64', 64], ['F256', 256]], FUT = [['5 minutes', 5], ['30 minutes', 30], ['3 hours', 180], ['30 hours', 1800]];
    const stage = m => (m <= 10 ? ['good', 'Overage protection'] : m <= 60 ? ['warn', 'Interactive delay'] : m <= 1440 ? ['bad', 'Interactive rejection'] : ['bad', 'Background rejection']);
    eq(await chipTexts('cl-s'), SKU.map(s => s[0]), 'capacity lab: the size chips');
    eq(await chipTexts('cl-f'), FUT.map(s => s[0]), 'capacity lab: the amount chips');
    for (let s = 0; s < SKU.length; s++) for (let f = 0; f < FUT.length; f++) {
      await pick('cl-s', String(s)); await pick('cl-f', String(f));
      const cu = SKU[s][1], min = FUT[f][1], b = await bigs(), st = stage(min);
      eq(b.map(x => x[0]), [n(cu), n(cu * 2), n(cu * 6), n(cu * 60 * min)], 'capacity lab, ' + SKU[s][0] + ' and ' + FUT[f][0] + ': the four numbers');
      eq(b.map(x => x[2]), ['', 'good', '', min > 60 ? 'bad' : min > 10 ? 'warn' : 'good'], 'capacity lab, ' + SKU[s][0] + ' and ' + FUT[f][0] + ': the colours');
      const c = (await callouts())[0];
      ok(c[0] === st[0] && c[1].startsWith(st[1] + '.'), 'capacity lab, ' + SKU[s][0] + ' and ' + FUT[f][0] + ': the stage is ' + st[1] + ' (' + c[0] + ': ' + c[1].slice(0, 40) + ')');
      await noRaw('capacity lab, ' + SKU[s][0] + ' and ' + FUT[f][0]);
    }
    eq(await pills(), ['from documentation', 'computed'], 'capacity lab: the note says that it is from documentation and that the arithmetic is computed');
  });

  ok(errs.length === 0, 'no console or page errors: ' + errs.slice(0, 3).join(' | '));
  await browser.close(); srv.close();
  console.log(fail ? fail + ' lab checks FAILED, ' + pass + ' passed' : pass + ' lab checks passed');
  process.exit(fail ? 1 : 0);
})();
