// End-to-end test of the run lab of the CDC project walkthrough, in a real browser.
// It opens project-cdc/index.html, clicks every chip of the lab, and compares what the page shows with
//   (a) what was recorded (project-cdc/js/real.js), and
//   (b) values that are worked out by model.js, which shares nothing with the lab: what each run must print and what each layer must hold after it.
// Nothing is read from the widget code. A lab that shows a wrong number, a wrong colour or a stale label fails here, even when the data behind it passes verify/check_widgets.js.
// No step may show an HTML tag, backticks, asterisks, "undefined" or "NaN" as text.
// Needs Playwright:  npm install playwright && npx playwright install chromium
// Run: node project-cdc/verify/e2e_labs.js
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
  await page.addInitScript(() => { try { localStorage.setItem('dep.project-cdc.v1', JSON.stringify({ track: 'all', chosen: true })); } catch (e) { /* ignore */ } });
  await page.goto('http://127.0.0.1:' + srv.address().port + '/project-cdc/index.html'); await page.waitForTimeout(300);

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
  const S = M.simulate();

  await section('run lab', async () => {
    await open('runlab');
    const defs = [
      { key: 'snapshot', chip: 'Snapshot', kind: 'good', has: ['read the whole table', 'inserted 200'] },
      { key: 'changes', chip: 'Changes', kind: 'good', has: ['inserted 50', 'updated 36', 'one order that changed twice'] },
      { key: 'replay', chip: 'Replay of a batch', kind: 'good', has: ['same 87 events ran again', 'left 86 alone', 'nothing changed'] },
      { key: 'backlog', chip: 'Backlog', kind: 'warn', has: ['stopped', 'released', 'updated 100', 'Nothing was lost'] },
      { key: 'identity', chip: 'Identity', kind: 'good', has: ['REPLICA IDENTITY FULL', 'updated 2'] }
    ];
    eq(await chipTexts('cd-k'), defs.map(d => d.chip), 'run lab: the chips name the five runs');
    eq(await chipOn('cd-k'), ['1'], 'run lab: it opens on the day of changes');
    for (let k = 0; k < defs.length; k++) {
      await pick('cd-k', String(k));
      const d = defs[k], want = S.runs[d.key], a = S.after[d.key], b = await bigs(), co = (await callouts())[0], p = (await pres())[0];
      eq(b, [[n(want.new_messages), 'new messages in bronze', ''], [n(want.events), 'events applied', ''], [String(want.batches), 'micro-batch' + (want.batches === 1 ? '' : 'es'), ''], [want.inserted + ' / ' + want.updated + ' / ' + want.left, 'merge: inserted / updated / left alone', ''],
        [n(a.bronze), 'messages in bronze', ''], [n(a.silver), 'rows in silver', a.silver === a.silver_distinct ? 'good' : 'bad'], [a.live + ' / ' + a.deleted, 'live / deleted rows', ''], [n(a.source), 'orders in Postgres', a.live === a.source ? 'good' : 'bad']], 'run lab, ' + d.key + ': the numbers of the run and of the layers, from the model');
      eq(p, ['', M.runText(d.key, want).split('\n').slice(1).join('\n')], 'run lab, ' + d.key + ': the printed text, from the model');
      eq(co[0], d.kind, 'run lab, ' + d.key + ': the colour of the callout');
      d.has.forEach(s => ok(co[1].includes(s), 'run lab, ' + d.key + ': the callout says "' + s + '": ' + co[1].slice(0, 160)));
      const note = await notes();
      ok(note.includes(M.runText(d.key, want).split('\n')[0]) && note.includes('Spark ' + REAL.meta.pyspark) && note.includes('Delta Lake ' + REAL.meta.delta) && note.includes('PostgreSQL ' + REAL.meta.postgres) && note.includes('Kafka ' + REAL.meta.kafka) && note.includes('Debezium ' + REAL.meta.debezium), 'run lab, ' + d.key + ': the note names the command and the versions');
      await noRaw('run lab, ' + d.key);
    }
    eq(await pills(), ['recorded'], 'run lab: the note says that the output is recorded');
  });

  ok(errs.length === 0, 'no console or page errors: ' + errs.slice(0, 3).join(' | '));
  await browser.close(); srv.close();
  console.log(fail ? fail + ' lab checks FAILED, ' + pass + ' passed' : pass + ' lab checks passed');
  process.exit(fail ? 1 : 0);
})();
