// End-to-end test of the run lab of the lakehouse project walkthrough, in a real browser.
// It opens project-lakehouse/index.html, clicks every chip of the lab, and compares what the page shows with
//   (a) what was recorded (project-lakehouse/js/real.js), and
//   (b) values that are worked out by model.js, which shares nothing with the lab: what each run must print and what each layer must hold after it.
// Nothing is read from the widget code. A lab that shows a wrong number, a wrong colour or a stale label fails here, even when the data behind it passes verify/check_widgets.js.
// No step may show an HTML tag, backticks, asterisks, "undefined" or "NaN" as text.
// Needs Playwright:  npm install playwright && npx playwright install chromium
// Run: node project-lakehouse/verify/e2e_labs.js
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
  await page.addInitScript(() => { try { localStorage.setItem('dep.project-lakehouse.v1', JSON.stringify({ track: 'all', chosen: true })); } catch (e) { /* ignore */ } });
  await page.goto('http://127.0.0.1:' + srv.address().port + '/project-lakehouse/index.html'); await page.waitForTimeout(300);

  const REAL = await page.evaluate(() => LAB.real);
  const sceneOf = kind => page.evaluate(k => { let f = null; LAB.chapters.forEach(c => c.scenes.forEach(s => { if (s.type === 'widget' && s.kind === k) f = s.id; })); return f; }, kind);
  const open = async kind => { const id = await sceneOf(kind); ok(!!id, 'the course has a lab of kind ' + kind); await page.evaluate(k => { location.hash = k + ':0'; }, id); await page.waitForTimeout(150); };
  const pick = async (act, v) => { await page.click('[data-act="' + act + '"][data-v="' + v + '"]'); await page.waitForTimeout(12); };
  const bigs = () => page.$$eval('.lab .big', els => els.map(e => [e.querySelector('b').textContent, e.querySelector('span').textContent, [...e.classList].filter(c => c !== 'big' && c !== 'long').join(' ')]));
  const chipOn = act => page.$$eval('[data-act="' + act + '"].on', els => els.map(e => e.getAttribute('data-v')));
  const chipTexts = act => page.$$eval('[data-act="' + act + '"]', els => els.map(e => e.innerText.trim()));
  const callouts = () => page.$$eval('.lab .callout', els => els.map(e => [e.className.replace('callout', '').trim(), e.innerText.replace(/\s+/g, ' ').trim()]));
  const pres = () => page.$$eval('.lab .lab-pre', els => els.map(e => [e.className.replace('lab-pre', '').trim(), e.textContent]));
  const notes = () => page.$eval('.lab .lab-note', e => e.innerText.replace(/\s+/g, ' ').trim());
  const pills = () => page.$$eval('.lab .lab-note .pill', els => els.map(e => e.innerText.trim().toLowerCase()));      // the style sheet prints them in capitals
  const noRaw = async where => {
    const t = await page.$eval('.lab', el => { const c = el.cloneNode(true); c.querySelectorAll('.lab-pre').forEach(e => e.remove()); return c.innerText; });
    ok(!/[`]|\*\*|<\/?[a-z][a-z0-9]*[ >]|undefined|NaN|\[object Object\]/.test(t), where + ' shows no raw markup, undefined or NaN: ' + t.slice(0, 80));
    const p = await page.$$eval('.lab .lab-pre', els => els.map(e => e.textContent).join('\n'));
    ok(!/undefined|NaN|\[object Object\]/.test(p), where + ': the recorded text shows no undefined or NaN');
  };
  const section = async (name, fn) => { try { await fn(); } catch (e) { fail++; console.log('FAIL:', name, 'threw', String(e.message).split('\n')[0]); } };

  const M = require('./model.js');
  const S = M.simulate([1, 2, 3, 3]);

  await section('run lab', async () => {
    await open('runlab');
    const defs = [
      { key: 'day1', chip: 'Day 1', kind: 'good', has: ['duplicate of order 7'] },
      { key: 'day2', chip: 'Day 2', kind: 'good', has: ['a replay of the file of day 1'] },
      { key: 'day3', chip: 'Day 3', kind: 'warn', has: ['`coupon`'.replace(/`/g, ''), 'old event of order 5', 'left it alone'] },
      { key: 'day3_again', chip: 'Day 3 again', kind: 'good', has: ['did nothing', 'in the ledger'] }
    ];
    eq(await chipTexts('lk-k'), defs.map(d => d.chip), 'run lab: the chips name the four runs');
    eq(await chipOn('lk-k'), ['1'], 'run lab: it opens on day 2');
    for (let k = 0; k < defs.length; k++) {
      await pick('lk-k', String(k));
      const d = defs[k], want = S.runs[k], a = S.after[k], b = await bigs(), co = (await callouts())[0], p = (await pres())[0];
      const first = want.nothing_to_do
        ? [['0', 'new files', 'good'], ['0', 'bronze rows of the run', ''], ['nothing to do', 'every file is in the ledger', 'good']]
        : [[String(want.files), 'new files', ''], [n(want.bronze_rows), 'bronze rows of the run', ''], [String(want.quarantined), 'quarantined', want.quarantined ? 'warn' : ''], [want.inserted + ' / ' + want.updated + ' / ' + want.left, 'merge: inserted / updated / left alone', '']];
      eq(b.slice(0, first.length), first, 'run lab, ' + d.key + ': the numbers of the run, from the model');
      eq(b.slice(first.length), [[n(a.bronze), 'bronze rows in all', ''], [n(a.silver), 'orders in silver', a.silver === a.silver_distinct ? 'good' : 'bad'], [n(a.quarantine), 'rows in the quarantine', ''], [n(a.gold), 'rows in gold', '']], 'run lab, ' + d.key + ': what the layers hold after the run, from the model');
      eq(p, ['', M.runText(want).split('\n').slice(1).join('\n')], 'run lab, ' + d.key + ': the printed text, from the model');
      eq(co[0], d.kind, 'run lab, ' + d.key + ': the colour of the callout');
      d.has.forEach(s => ok(co[1].includes(s), 'run lab, ' + d.key + ': the callout says "' + s + '": ' + co[1].slice(0, 160)));
      if (!want.nothing_to_do) ['inserted ' + want.inserted, 'quarantined', String(want.valid)].forEach(s => ok(co[1].includes(s) || d.key !== 'day1', 'run lab, ' + d.key + ': the callout has ' + s));
      if (d.key === 'day2') ['inserted ' + want.inserted, 'updated ' + want.updated, 'left ' + want.left + ' alone', 'same ' + want.quarantined + ' dirty lines'].forEach(s => ok(co[1].includes(s), 'run lab, day 2: the callout says "' + s + '"'));
      if (d.key === 'day3') ok(co[1].includes(want.quarantined + ' rows') && co[1].includes('bad_type'), 'run lab, day 3: the callout counts the quarantined rows and names bad_type');
      ok((await notes()).includes('python -m lakehouse.run --day ' + want.day) && (await notes()).includes('Spark ' + REAL.meta.pyspark) && (await notes()).includes('Delta Lake ' + REAL.meta.delta), 'run lab, ' + d.key + ': the note names the command and the versions');
      await noRaw('run lab, ' + d.key);
    }
    eq(await pills(), ['recorded'], 'run lab: the note says that the output is recorded');
  });

  ok(errs.length === 0, 'no console or page errors: ' + errs.slice(0, 3).join(' | '));
  await browser.close(); srv.close();
  console.log(fail ? fail + ' lab checks FAILED, ' + pass + ' passed' : pass + ' lab checks passed');
  process.exit(fail ? 1 : 0);
})();
