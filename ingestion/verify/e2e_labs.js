// End-to-end test of the 3 labs of the ingestion course, in a real browser.
// It opens ingestion/index.html, clicks every chip of every lab, and compares what the page shows with
//   (a) what was recorded (ingestion/js/real.js), and
//   (b) values that are worked out by model.js, which shares nothing with the widgets: what each way of loading must write and hold, what day 3 does under each contract, and what each sync mode must read.
// Nothing is read from the widget code. A lab that shows a wrong number, a wrong colour or a stale label fails here, even when the data behind it passes verify/check_widgets.js.
// No step may show an HTML tag, backticks, asterisks, "undefined" or "NaN" as text.
// Needs Playwright:  npm install playwright && npx playwright install chromium
// Run: node ingestion/verify/e2e_labs.js
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
  await page.addInitScript(() => { try { localStorage.setItem('dep.ingestion.v1', JSON.stringify({ track: 'all', chosen: true })); } catch (e) { /* ignore */ } });
  await page.goto('http://127.0.0.1:' + srv.address().port + '/ingestion/index.html'); await page.waitForTimeout(300);

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

  // lab 1: seven ways to load
  await section('load lab', async () => {
    await open('loadlab');
    const defs = [
      ['append, the same day twice', { strategy: 'append' }, [1, 1], 'bad', 'Append is right for events'], ['replace, the same day twice', { strategy: 'replace' }, [1, 1], 'good', 'rewrites the whole table'],
      ['merge on id, the same day twice', { strategy: 'merge' }, [1, 1], 'good', 'updates the row that exists'], ['merge on id, day 1 then day 2, the whole list', { strategy: 'merge' }, [1, 2], 'warn', 'a merge never deletes'],
      ['append with a cursor, day 1 then day 2', { strategy: 'append', cursor: true }, [1, 2], 'bad', 'added the changed orders as new rows'], ['merge with a cursor, day 1 then day 2', { strategy: 'merge', cursor: true }, [1, 2], 'warn', 'Two gaps remain'],
      ['merge with a cursor, day 1, day 2, day 2 again', { strategy: 'merge', cursor: true }, [1, 2, 2], 'good', 'safe to run twice']
    ];
    eq(await chipTexts('ll-k'), defs.map((d, k) => (k + 1) + '. ' + d[0]), 'load lab: the chips name the seven cases');
    eq(await chipOn('ll-k'), ['2'], 'load lab: it opens on the merge case');
    for (let k = 0; k < defs.length; k++) {
      await pick('ll-k', String(k));
      const [name, o, days, kind, has] = defs[k], r = M.load(days, o), tone = r.rows === r.shop ? 'good' : r.rows === r.distinct ? 'warn' : 'bad';
      const b = await bigs(), L = await lanes(), co = (await callouts())[0], p = await pres();
      eq(b.map(x => [x[0], x[1], x[2]]), [[r.wrote.join(', '), 'rows that each run wrote', ''], [n(r.rows), 'rows in the destination', tone], [n(r.distinct), 'distinct orders', ''], [n(r.shop), 'orders the shop holds', '']], 'load lab, ' + name + ': the numbers, their labels and colours');
      eq([L[0][0], L[0][1], L[0][2]], ['rows in the destination', n(r.rows) + ' for ' + n(r.shop) + ' orders in the shop', tone], 'load lab, ' + name + ': the bar and its colour');
      ok(Math.abs(width(L[0]) - Math.max(1, Math.min(100, r.rows / Math.max(r.rows, r.shop) * 100))) < 0.01, 'load lab, ' + name + ': the bar is in proportion: ' + width(L[0]));
      eq(co[0], kind, 'load lab, ' + name + ': the colour of the callout');
      ok(co[1].includes(has), 'load lab, ' + name + ': the callout says "' + has + '": ' + co[1].slice(0, 140));
      if (k === 5) {
        const m = M.load([1, 2], { strategy: 'merge', cursor: true });
        eq(p, [['err', 'order 11, deleted in the shop: still in the destination\norder 12, shipped in the shop: the destination says ' + m.table.filter(t => t.id === 12)[0].status + '\norders shipped: ' + m.table.filter(t => t.status === 'SHIPPED').length + ' in the destination, ' + M.sorted(2).filter(t => t.status === 'SHIPPED').length + ' in the shop']], 'load lab, the cursor case shows the two gaps');
      } else eq(p, [], 'load lab, ' + name + ': no list of gaps');
      await noRaw('load lab, ' + name);
    }
    ok((await notes()).includes('dlt ' + REAL.meta.dlt) && (await notes()).includes('DuckDB ' + REAL.meta.duckdb), 'load lab: the note names the versions of dlt and DuckDB');
    eq(await pills(), ['recorded'], 'load lab: the note says that the output is recorded');
  });

  // lab 2: day 3 under five contracts
  await section('drift lab', async () => {
    await open('driftlab');
    const modes = [['evolve (the default)', 'warn', 'four columns'], ['columns: freeze', 'tip', 'frozen'], ['columns: discard_row', 'bad', 'without an error'], ['columns: discard_value', 'warn', 'new values were dropped'], ['data_type: freeze', 'tip', 'order 117']];
    eq(await chipTexts('dl-k'), modes.map(m => m[0]), 'drift lab: the chips name the five contracts');
    eq(await chipOn('dl-k'), ['0'], 'drift lab: it opens on the default');
    for (let k = 0; k < modes.length; k++) {
      await pick('dl-k', String(k));
      const [name, kind, has] = modes[k], d = M.drift(name), failed = !!d.error, rows = failed ? M.load([1, 2], { strategy: 'merge', cursor: true }).rows : d.inDestination;
      const b = await bigs(), co = (await callouts())[0], p = (await pres())[0];
      eq(b.map(x => [x[0], x[1], x[2]]), [[failed ? 'failed' : 'loaded ' + d.wrote, 'the run of day 3', failed ? 'bad' : 'good'], [n(rows), 'orders in the destination (a complete load gives 117)', rows === 117 ? 'good' : 'bad'], [String(failed ? 0 : d.newColumns.length), 'new columns', '']], 'drift lab, ' + name + ': the numbers, their labels and colours');
      eq(co[0], kind, 'drift lab, ' + name + ': the colour of the callout');
      ok(co[1].includes(has), 'drift lab, ' + name + ': the callout says "' + has + '": ' + co[1].slice(0, 140));
      if (failed) { eq(p[0], 'err', 'drift lab, ' + name + ': a failure is shown as an error'); ok(/Contract on `(columns|data_type)` with `contract_mode=freeze` is violated/.test(p[1]), 'drift lab, ' + name + ': the error text: ' + p[1].slice(0, 100)); ok(p[1].includes(d.error === 'columns' ? '`coupon`' : '`total_cents__v_text`'), 'drift lab, ' + name + ': the error names the column'); }
      else { eq(p[0], '', 'drift lab, ' + name + ': a load that worked is not shown as an error'); eq(p[1], 'new columns: ' + d.newColumns.join(', '), 'drift lab, ' + name + ': the new columns'); }
      await noRaw('drift lab, ' + name);
    }
    eq(await pills(), ['recorded'], 'drift lab: the note says that the output is recorded');
  });

  // lab 3: five sync modes
  await section('sync lab', async () => {
    await open('synclab');
    const defs = [['full refresh, replace', 'replace', true, true, 'good', 'rewrites the table'], ['full refresh, append', 'append', true, true, 'bad', 'Append keeps history'], ['full refresh, merge', 'merge', true, true, 'good', 'updates the rows by key'],
      ['incremental, a cursor that always moves', 'append', false, true, 'bad', 'only saves work when the cursor tells the truth'], ['incremental, a cursor that tells the truth', 'append', false, false, 'good', 'was made for']];
    eq(await chipTexts('sl-k'), defs.map((d, k) => (k + 1) + '. ' + d[0]), 'sync lab: the chips name the five cases');
    eq(await chipOn('sl-k'), ['4'], 'sync lab: it opens on the honest cursor');
    for (let k = 0; k < defs.length; k++) {
      await pick('sl-k', String(k));
      const [name, strategy, full, moves, kind, has] = defs[k], r = M.sync(strategy, full, moves), good = r.rows[1] === r.distinct ? 'good' : 'bad';
      const b = await bigs(), L = await lanes(), co = (await callouts())[0];
      eq(b.map(x => [x[0], x[1], x[2]]), [[String(r.read[0]), 'records read, sync 1', ''], [String(r.read[1]), 'records read, sync 2', r.read[1] === 0 ? 'good' : ''], [String(r.rows[1]), 'rows after sync 2', good], [String(r.distinct), 'distinct ids', '']], 'sync lab, ' + name + ': the numbers, their labels and colours');
      eq([L[0][0], L[0][1], L[0][2]], ['rows after sync 2', r.rows[1] + ' rows for ' + r.distinct + ' users', good], 'sync lab, ' + name + ': the bar and its colour');
      ok(Math.abs(width(L[0]) - Math.max(1, Math.min(100, r.rows[1] / 40 * 100))) < 0.01, 'sync lab, ' + name + ': the bar is in proportion to 40: ' + width(L[0]));
      eq(co[0], kind, 'sync lab, ' + name + ': the colour of the callout');
      ok(co[1].includes(has), 'sync lab, ' + name + ': the callout says "' + has + '": ' + co[1].slice(0, 140));
      await noRaw('sync lab, ' + name);
    }
    ok((await notes()).includes('PyAirbyte ' + REAL.meta.airbyte) && (await notes()).includes(REAL.meta.connector), 'sync lab: the note names PyAirbyte and the connector');
    eq(await pills(), ['recorded'], 'sync lab: the note says that the output is recorded');
  });

  ok(errs.length === 0, 'no console or page errors: ' + errs.slice(0, 3).join(' | '));
  await browser.close(); srv.close();
  console.log(fail ? fail + ' lab checks FAILED, ' + pass + ' passed' : pass + ' lab checks passed');
  process.exit(fail ? 1 : 0);
})();
