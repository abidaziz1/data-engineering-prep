// End-to-end test of the 3 labs of the ELT project walkthrough, in a real browser.
// It opens project-elt/index.html, clicks every chip of every lab, and compares what the page shows with
//   (a) what was recorded (project-elt/js/real.js), and
//   (b) values that are worked out by model.js, which shares nothing with the lab: what each load must write, what each layer holds after each run.
// Nothing is read from the widget code. A lab that shows a wrong number, a wrong colour or a stale label fails here, even when the data behind it passes verify/check_widgets.js.
// No step may show an HTML tag, backticks, asterisks, "undefined" or "NaN" as text.
// Needs Playwright:  npm install playwright && npx playwright install chromium
// Run: node project-elt/verify/e2e_labs.js
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
  await page.addInitScript(() => { try { localStorage.setItem('dep.project-elt.v1', JSON.stringify({ track: 'all', chosen: true })); } catch (e) { /* ignore */ } });
  await page.goto('http://127.0.0.1:' + srv.address().port + '/project-elt/index.html'); await page.waitForTimeout(300);

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
  const noRaw = async where => {
    const t = await page.$eval('.lab', el => { const c = el.cloneNode(true); c.querySelectorAll('.lab-pre').forEach(e => e.remove()); return c.innerText; });
    ok(!/[`]|\*\*|<\/?[a-z][a-z0-9]*[ >]|undefined|NaN|\[object Object\]/.test(t), where + ' shows no raw markup, undefined or NaN: ' + t.slice(0, 80));
    const p = await page.$$eval('.lab .lab-pre', els => els.map(e => e.textContent).join('\n'));      // a recorded error text keeps its own backticks
    ok(!/undefined|NaN|\[object Object\]/.test(p), where + ': the recorded text shows no undefined or NaN');
  };
  const width = l => +/width:([\d.]+)%/.exec(l[3])[1];
  const section = async (name, fn) => { try { await fn(); } catch (e) { fail++; console.log('FAIL:', name, 'threw', String(e.message).split('\n')[0]); } };
  const colour = exit => (exit ? 'bad' : 'good');

  const M = require('./model.js');

  // the run explorer
  await section('run lab', async () => {
    await open('runlab');
    const detail = M.runDetail([1, 2, 3, 3, 2]).out;
    const defs = [
      { key: 'day1', chip: 'Day 1 (2026-03-01)', raw: 200, fct: 200, tasks: ['success', 'success', 'success', 'success'], dbt: [22, 22, 0, 0], kind: 'good', has: 'all 22 checks' },
      { key: 'day2', chip: 'Day 2 (2026-03-02)', raw: 230, fct: 230, tasks: ['success', 'success', 'success', 'success'], dbt: [22, 22, 0, 0], kind: 'good', has: 'Day 2 wrote 60 rows' },
      { key: 'day3_fail', chip: 'Day 3 (2026-03-03)', raw: 255, fct: 230, tasks: ['success', 'failed', 'not run', 'not run'], dbt: [14, 22, 1, 7], kind: 'bad', has: 'skipped 7' },
      { key: 'day3_fix', chip: 'Day 3 again (2026-03-03)', raw: 255, fct: 255, tasks: ['success', 'success', 'success', 'success'], dbt: [22, 22, 0, 0], kind: 'good', has: 'only 9 rows' },
      { key: 'backfill2', chip: 'Backfill of day 2 (2026-03-02)', raw: 255, fct: 255, tasks: ['success', 'success', 'success', 'success'], dbt: [22, 22, 0, 0], kind: 'good', has: 'safe to repeat' }
    ];
    eq(await chipTexts('rl-k'), defs.map(d => d.chip), 'run lab: the chips name the five runs');
    eq(await chipOn('rl-k'), ['2'], 'run lab: it opens on the failed run');
    for (let k = 0; k < defs.length; k++) {
      await pick('rl-k', String(k));
      const d = defs[k], b = await bigs(), co = (await callouts())[0], p = (await pres())[0];
      const cls = v => (v === 'success' ? 'good' : v === 'failed' ? 'bad' : '');
      eq(b.slice(0, 4).map(x => [x[0], x[1], x[2]]), [['load (dlt)', 0], ['build and test (dbt)', 1], ['quality gate', 2], ['publish', 3]].map(([label, i]) => [d.tasks[i], label, cls(d.tasks[i])]), 'run lab, ' + d.key + ': the four steps and their colours');
      eq(b.slice(4).map(x => [x[0], x[1], x[2]]), [[String(d.raw), 'orders in raw', ''], [String(d.fct), 'orders in the marts', d.fct === d.raw ? 'good' : 'bad'], [d.dbt[0] + ' / ' + d.dbt[1], 'dbt checks passed', d.dbt[2] ? 'bad' : 'good']], 'run lab, ' + d.key + ': the layers and the dbt checks');
      const day = [1, 2, 3, 3, 2][k];
      eq(p[1].split('\n')[0], 'loaded day ' + day + ': orders ' + detail[k].orders + ', order lines ' + detail[k].lines + ', stores 12', 'run lab, ' + d.key + ': the load line, from the model');
      eq(p[1].split('\n')[1], 'dbt: PASS=' + d.dbt[0] + ' ERROR=' + d.dbt[2] + ' SKIP=' + d.dbt[3] + ' of ' + d.dbt[1], 'run lab, ' + d.key + ': the dbt summary');
      eq(p[0], d.tasks[1] === 'failed' ? 'err' : '', 'run lab, ' + d.key + ': a failed run is shown as an error');
      if (d.tasks[1] === 'failed') ok(p[1].includes('failed test: relationships_stg_order_lines_sku__sku__ref_product_prices_'), 'run lab, ' + d.key + ': the failing test is named');
      eq(co[0], d.kind, 'run lab, ' + d.key + ': the colour of the callout');
      ok(co[1].includes(d.has), 'run lab, ' + d.key + ': the callout says "' + d.has + '": ' + co[1].slice(0, 140));
      await noRaw('run lab, ' + d.key);
    }
    ok((await notes()).includes('dlt ' + REAL.meta.dlt) && (await notes()).includes('dbt ' + REAL.meta.dbt) && (await notes()).includes('Airflow ' + REAL.meta.airflow), 'run lab: the note names the versions of dlt, dbt and Airflow');
    eq(await pills(), ['recorded'], 'run lab: the note says that the output is recorded');
  });

  ok(errs.length === 0, 'no console or page errors: ' + errs.slice(0, 3).join(' | '));
  await browser.close(); srv.close();
  console.log(fail ? fail + ' lab checks FAILED, ' + pass + ' passed' : pass + ' lab checks passed');
  process.exit(fail ? 1 : 0);
})();
