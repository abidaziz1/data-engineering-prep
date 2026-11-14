// End-to-end test of the 8 labs of the Apache Flink tutorial, in a real browser.
// It opens flink/index.html, clicks every chip and button of every lab, and compares what the page shows with
//   (a) what Apache Flink 2.2.1 returned (flink/js/real.js), and
//   (b) values that were worked out by hand and are written into this file (slot sharing, the changelog of a count, the watermark after each order, the windows of each kind,
//       a checkpoint with a crash, the murmur hash of a key, the arithmetic of a slow step).
// Nothing is read from the widget code. A lab that shows a wrong number, a stale label or a table that does not match the recording fails here,
// even when the logic behind it passes verify/check_widgets.js. No step may show raw markup, "undefined" or "NaN".
// Needs Playwright:  npm install playwright && npx playwright install chromium
// Run: node flink/verify/e2e_labs.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const two = n => String(n).padStart(2, '0');
const mmss = s => (s < 0 ? '-' : '') + two(Math.floor(Math.abs(s) / 60)) + ':' + two(Math.abs(s) % 60);
const fmtN = (x, d) => (Math.round(x * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
const mb = n => n >= 1099511627776 ? fmtN(n / 1099511627776, 2) + ' TiB' : n >= 1073741824 ? fmtN(n / 1073741824, 2) + ' GiB' : n >= 1048576 ? fmtN(n / 1048576, 1) + ' MiB' : n >= 1024 ? fmtN(n / 1024, 1) + ' KiB' : fmtN(n) + ' B';
const STORES = ['s01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10', 's11', 's12'];

// ---- the data, worked out by hand -------------------------------------------------------------------------------------------------------------------------------
// the first twelve orders: (order, store, cents). Store s01 has orders 1, 4, 7, 9 and 12.
const ORDERS = [[1, 's01', 300], [2, 's02', 337], [3, 's07', 374], [4, 's01', 411], [5, 's04', 448], [6, 's11', 485], [7, 's01', 522], [8, 's06', 559], [9, 's01', 596], [10, 's04', 633], [11, 's09', 670], [12, 's01', 707]];
const REFUND = { 1: 1, 6: 1, 11: 1 };
// the fourteen orders of mission 3, in arrival order: (order, store, cents, seconds after 00:00:00 at which the order happened)
const EVENTS = [[1, 's01', 400, 5], [2, 's01', 350, 20], [3, 's02', 500, 40], [4, 's01', 420, 65], [5, 's02', 380, 50], [6, 's01', 610, 70], [7, 's02', 450, 125], [8, 's01', 300, 55],
  [9, 's02', 520, 130], [10, 's01', 700, 190], [11, 's02', 330, 118], [12, 's01', 410, 200], [13, 's02', 480, 250], [14, 's01', 360, 61]];

// the changelog of GROUP BY store (count, sum), by hand: the first order of a store is +I, every later one is -U with the old row and +U with the new
function changelogCount(upto) {
  const st = {}, out = [];
  ORDERS.slice(0, upto).forEach((o, i) => {
    const s = st[o[1]];
    if (!s) { st[o[1]] = [1, o[2]]; out.push(['+I', o[1], '1', String(o[2])]); }
    else { out.push(['-U', o[1], String(s[0]), String(s[1])]); s[0]++; s[1] += o[2]; out.push(['+U', o[1], String(s[0]), String(s[1])]); }
  });
  return out;
}
function changelogCount2(upto) {                              // how many stores have each count: a group that becomes empty is deleted
  const l1 = changelogCount(upto), g = {}, out = [];
  l1.forEach(c => {
    const n = Number(c[2]);
    if (c[0] === '+I' || c[0] === '+U') { if (!g[n]) { g[n] = 1; out.push(['+I', String(n), '1']); } else { out.push(['-U', String(n), String(g[n])]); g[n]++; out.push(['+U', String(n), String(g[n])]); } }
    else if (g[n] === 1) { delete g[n]; out.push(['-D', String(n), '1']); } else { out.push(['-U', String(n), String(g[n])]); g[n]--; out.push(['+U', String(n), String(g[n])]); }
  });
  return out;
}
function changelogFilter(upto) { return ORDERS.slice(0, upto).filter(o => REFUND[o[0]]).map(o => ['+I', String(o[0]), o[1], String(o[2])]); }
function tableOf(changes) { const t = {}; changes.forEach(c => { const key = c[1]; if (c[0] === '+I' || c[0] === '+U') t[key] = c.slice(1); else delete t[key]; }); return Object.keys(t).map(k => t[k]).sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true })); }

// the watermark: the largest time seen so far minus the delay. An order is late when the watermark before it had reached the end of its minute.
function watermarkRun(delay) {
  let wm = null; const rows = [];
  EVENTS.forEach(e => {
    const start = e[3] - e[3] % 60, late = wm !== null && wm >= start + 60;
    wm = wm === null ? e[3] - delay : Math.max(wm, e[3] - delay);
    rows.push({ id: e[0], at: mmss(e[3]), start, late, wm });
  });
  return rows;
}

(async () => {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end(); }
    res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + srv.address().port + '/flink/index.html';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.addInitScript(() => { try { localStorage.setItem('dep.flink.v1', JSON.stringify({ track: 'all', chosen: true })); } catch (e) { /* storage may be blocked */ } });
  await page.goto(url); await page.waitForTimeout(300);

  const REAL = await page.evaluate(() => JSON.parse(JSON.stringify(LAB.real)));
  const C = k => REAL.counts[k], T = k => REAL.tables[k];
  const sceneOf = kind => page.evaluate(k => { let found = null; LAB.chapters.forEach(c => c.scenes.forEach(s => { if (s.type === 'widget' && s.kind === k) found = { id: s.id, steps: LAB.R.widget.steps(s) }; })); return found; }, kind);
  const go = async key => { await page.evaluate(k => { location.hash = k; }, key); await page.waitForTimeout(30); };
  const pick = async (act, v) => { await page.click('[data-act="' + act + '"][data-v="' + v + '"]'); await page.waitForTimeout(12); };
  const reset = key => page.evaluate(k => { LAB.app.local[k] = undefined; LAB.app.render(true); }, key).then(() => page.waitForTimeout(20));
  const tables = () => page.$$eval('.lab .tbl', ts => ts.map(t => [...t.querySelectorAll('tbody tr')].map(r => [...r.children].map(td => td.innerText.trim().replace(/\s*\n\s*/g, ' ')))));
  const bigs = () => page.$$eval('.lab .big', els => els.map(e => ({ b: e.querySelector('b').textContent, s: e.querySelector('span').textContent, cls: e.className })));
  const chipVals = act => page.$$eval('[data-act="' + act + '"]', els => els.map(e => e.getAttribute('data-v')));
  const chipOn = act => page.$$eval('[data-act="' + act + '"].on', els => els.map(e => e.getAttribute('data-v')));
  const labText = () => page.$eval('.lab', e => e.innerText.replace(/\s+/g, ' ').trim());
  const callouts = () => page.$$eval('.lab .callout', els => els.map(e => ({ t: e.innerText.replace(/\s+/g, ' ').trim(), cls: e.className })));
  const strips = () => page.$$eval('.lab .strip', els => els.map(s => [...s.querySelectorAll('.rec')].map(r => ({ t: r.textContent, cls: r.className }))));
  const lanes = () => page.$$eval('.lab .lane', els => els.map(l => ({ n: l.querySelector('.lane-n').textContent, v: l.querySelector('.lane-v').textContent, bar: (l.querySelector('.gbar') || {}).textContent || '', cls: (l.querySelector('.gbar') || {}).className || '' })));
  const disabled = (act, v) => page.$eval('[data-act="' + act + '"][data-v="' + v + '"]', e => e.disabled);
  const looseText = () => page.$eval('.lab', el => { const c = el.cloneNode(true); c.querySelectorAll('.code').forEach(x => x.remove()); return c.innerText; });
  // no markup shows as text: backticks, double asterisks and HTML tags outside the code blocks mean that a string skipped the formatter, or was escaped by it
  const noRaw = async where => { const t = await looseText(); ok(!/[`]|\*\*|<\/?[a-z][a-z0-9]*[ >]|undefined|NaN|\[object Object\]/.test(t), where + ' shows no raw markup, undefined or NaN: ' + (t.match(/.{0,30}([`]|\*\*|<\/?[a-z][a-z0-9]*[ >]|undefined|NaN|\[object Object\]).{0,30}/) || [''])[0]); };
  const section = async (name, fn) => { try { await fn(); } catch (e) { fail++; console.log('FAIL:', name, 'threw', String(e.message).split('\n')[0]); } };

  // ------------------------------------------------------------------------------------------------------------------------------
  // lab 1: parallelism, chaining and slots. A slot holds one task of every vertex, so a job needs as many slots as its parallelism (slot sharing).
  // ------------------------------------------------------------------------------------------------------------------------------
  await section('parallelism lab', async () => {
    const sc = await sceneOf('parallelismlab');
    await go(sc.id + ':0'); await reset('pl');
    ok(same(await chipVals('pl-p'), ['1', '2', '3', '4', '5', '6']) && same(await chipVals('pl-c'), ['1', '0']) && same(await chipVals('pl-t'), ['1', '2', '3']), 'parallelism lab offers parallelism 1 to 6, chaining on and off, and 1 to 3 TaskManagers');
    ok(same(await chipOn('pl-p'), ['2']) && same(await chipOn('pl-c'), ['1']) && same(await chipOn('pl-t'), ['2']), 'parallelism lab starts at parallelism 2, chaining on, two TaskManagers (the recorded cluster)');
    for (const tms of [1, 2, 3]) for (const chain of [1, 0]) for (const p of [1, 2, 3, 4, 5, 6]) {
      await pick('pl-t', tms); await pick('pl-c', chain); await pick('pl-p', p);
      const verts = chain ? 2 : 6, total = tms * 2, fits = p <= total, where = 'parallelism lab, p=' + p + ' chaining ' + (chain ? 'on' : 'off') + ' ' + tms + ' TaskManager(s)';
      const b = await bigs();
      ok(b[0].b === String(verts) && b[1].b === String(verts * p) && b[2].b === p + ' of ' + total, where + ': ' + verts + ' vertices, ' + verts * p + ' tasks, ' + p + ' of ' + total + ' slots (got ' + b.map(x => x.b).join(' / ') + ')');
      ok(/good/.test(b[2].cls) === fits && /bad/.test(b[2].cls) === !fits, where + ': the slots box is ' + (fits ? 'green' : 'red'));
      ok((await page.$$('.slotbox')).length === tms, where + ': ' + tms + ' TaskManager boxes');
      const used = await page.$$eval('.slot:not(.free)', s => s.map(x => x.querySelectorAll('.task').length));
      ok(fits ? used.length === p && used.every(n => n === verts) : used.length === 0, where + ': ' + (fits ? p + ' slots in use, each with ' + verts + ' tasks' : 'no slot in use because the job does not start'));
      const free = await page.$$eval('.slot.free', s => s.map(x => x.textContent.trim()));
      ok(free.length === (fits ? total - p : total) && free.every(t => t === (fits ? 'free' : 'no job')), where + ': the other slots are ' + (fits ? 'free' : 'marked "no job"'));
      const c = (await callouts())[0].t;
      ok(fits ? c.startsWith('The job starts. It has ' + verts * p + ' tasks and uses ' + p + ' slot') : c.includes('NoResourceAvailableException') && c.includes('asks for ' + p + ' slots and the cluster has ' + total), where + ': the callout says ' + (fits ? 'that the job starts' : 'why it fails') + ' (got "' + c.slice(0, 90) + '")');
    }
    // by hand: the recorded cluster has four slots. Parallelism 4 with chaining has 8 tasks in 4 slots; parallelism 5 does not start.
    await pick('pl-t', 2); await pick('pl-c', 1); await pick('pl-p', 4);
    ok(same((await bigs()).map(x => x.b), ['2', '8', '4 of 4']), 'parallelism lab: parallelism 4 on the recorded cluster is 8 tasks in 4 slots');
    await pick('pl-p', 5);
    ok((await bigs())[2].b === '5 of 4', 'parallelism lab: parallelism 5 asks for 5 of 4 slots');
    const note = await labText(), W = T('world.slots').rows;
    ok(note.includes('parallelism 1, 2, 4, 5') && W.every(r => note.includes(r[1] + ' tasks used ' + r[2]) || r[3] === 'FAILED'), 'parallelism lab: the note lists what Flink ran');
    await noRaw('parallelism lab');
  });

  // ------------------------------------------------------------------------------------------------------------------------------
  // lab 2: the changelog of a streaming query, after every order, for three queries; then the mini-batch run that Flink printed
  // ------------------------------------------------------------------------------------------------------------------------------
  await section('changelog lab', async () => {
    const sc = await sceneOf('changeloglab');
    await go(sc.id + ':0'); await reset('cl');
    ok(same(await chipVals('cl-q'), ['count', 'count2', 'filter']), 'changelog lab offers three queries');
    const QS = { count: changelogCount, count2: changelogCount2, filter: changelogFilter };
    for (const q of ['count', 'count2', 'filter']) {
      await pick('cl-q', q);
      let t = await tables();
      ok(t.length === 0 && (await bigs())[0].b === '0 of 12', 'changelog lab, ' + q + ': nothing is fed at first');
      for (let k = 1; k <= 12; k++) {
        await pick('cl-step', 'next');
        const want = QS[q](k), tab = tableOf(want), b = await bigs(), where = 'changelog lab, ' + q + ' after ' + k + ' orders';
        t = await tables();
        ok(b[0].b === k + ' of 12', where + ': ' + k + ' of 12 orders fed');
        ok(b[1].b === String(want.length), where + ': ' + want.length + ' changes sent (got ' + b[1].b + ')');
        ok(b[2].b === String(tab.length), where + ': ' + tab.length + ' rows in the table (got ' + b[2].b + ')');
        ok(want.length === 0 ? t.length === 0 : same(t[0], want), where + ': the list of changes is the one worked out by hand' + (want.length ? ' (got ' + JSON.stringify(t[0] && t[0].slice(-2)) + ')' : ''));
        ok(tab.length === 0 ? t.length <= 1 : same(t[t.length - 1], tab), where + ': the table is the replay of the changes (got ' + JSON.stringify(t[t.length - 1] && t[t.length - 1].slice(0, 2)) + ')');
        await noRaw(where);
      }
      // by hand: the full runs. 12 orders, 7 stores: 7 inserts and 5 pairs of -U/+U = 17 changes. The count of counts: 25 changes. The refunds: 3.
      const total = { count: 17, count2: 25, filter: 3 }[q], rows = { count: 7, count2: 3, filter: 3 }[q];
      const b = await bigs();
      ok(b[1].b === String(total) && b[1].s.includes('recorded: ' + total) && b[2].b === String(rows), 'changelog lab, ' + q + ': after the 12th order ' + total + ' changes and ' + rows + ' rows, as recorded');
      ok((await callouts()).some(c => /same|only ever sends/.test(c.t)), 'changelog lab, ' + q + ': the callout compares with the batch result');
      ok(await disabled('cl-step', 'next') && await disabled('cl-step', 'all'), 'changelog lab, ' + q + ': the feed buttons are disabled after the last order');
      await pick('cl-step', 'reset'); ok((await bigs())[0].b === '0 of 12', 'changelog lab, ' + q + ': Start again');
      await pick('cl-step', 'all'); ok((await bigs())[1].b === String(total), 'changelog lab, ' + q + ': Feed all gives ' + total + ' changes');
    }
    ok(C('sql.stream_summary').changelog_rows === 17 && C('sql.two_level_summary').changelog_rows === 25 && C('sql.append_only_summary').rows === 3, 'recorded: 17, 25 and 3');
    // step 2: what Flink printed with and without mini-batch
    await go(sc.id + ':1'); await reset('cl');
    ok(same(await chipVals('cl-mb'), ['0', '1']), 'changelog lab, step 2: two settings');
    for (const mb1 of [0, 1]) {
      await pick('cl-mb', mb1);
      const rec = T(mb1 ? 'sql.minibatch' : 'sql.stream_group'), t = (await tables())[0], b = await bigs();
      ok(t.length === rec.rows.length && same(t, rec.rows.map(r => r.map(String))), 'changelog lab, step 2, ' + (mb1 ? 'mini-batch' : 'no mini-batch') + ': the table is what Flink printed');
      ok(b[0].b === String(mb1 ? 13 : 17) && b[1].b === '7', 'changelog lab, step 2: ' + (mb1 ? 13 : 17) + ' changes and 7 final rows');
      await noRaw('changelog lab step 2, mini-batch ' + mb1);
    }
    ok((await callouts())[0].t.includes('13 changes instead of 17'), 'changelog lab, step 2: the callout says 13 instead of 17');
  });

  // ------------------------------------------------------------------------------------------------------------------------------
  // lab 3: the watermark. For each delay the page is checked after every order: the watermark, the counted and dropped orders, the strip and the closed windows.
  // ------------------------------------------------------------------------------------------------------------------------------
  await section('watermark lab', async () => {
    const sc = await sceneOf('watermarklab');
    await go(sc.id + ':0'); await reset('wm');
    ok(same(await chipVals('wm-d'), ['0', '10', '30', '75', '200']) && same(await chipOn('wm-d'), ['10']), 'watermark lab offers delays 0, 10, 30, 75 and 200 s and starts at 10');
    for (const d of [0, 10, 30, 75, 200]) {
      await pick('wm-d', d);
      const run = watermarkRun(d);
      for (let k = 1; k <= 14; k++) {
        await pick('wm-step', 'next');
        const where = 'watermark lab, delay ' + d + ' s after ' + k + ' orders', b = await bigs(), seen = run.slice(0, k);
        const counted = seen.filter(x => !x.late).length, dropped = k - counted, wmNow = seen[k - 1].wm;
        ok(b[0].b === mmss(wmNow) && b[1].b === String(counted) && b[2].b === String(dropped), where + ': watermark ' + mmss(wmNow) + ', ' + counted + ' counted, ' + dropped + ' dropped (got ' + b.map(x => x.b).join(' / ') + ')');
        const s = (await strips())[0];
        ok(s.length === 14 && s.every((r, n) => n >= k ? /gap/.test(r.cls) : run[n].late ? /miss/.test(r.cls) : /right/.test(r.cls)), where + ': the strip marks counted, late and waiting orders');
        ok(s.every((r, n) => r.t === '#' + run[n].id + ' ' + run[n].at.slice(0)), where + ': the strip shows the order and the time it happened');
        const ln = await lanes();
        [0, 60, 120, 180, 240].forEach((w, i) => {
          const n = seen.filter(x => !x.late && x.start === w).length, closed = wmNow >= w + 60;
          ok(ln[i].n === mmss(w) + ' to ' + mmss(w + 60) && ln[i].v === (closed ? 'closed' : 'open') && ln[i].bar === (n ? n + ' order' + (n > 1 ? 's' : '') : '') && /win|open/.test(ln[i].cls) && (closed ? /win/.test(ln[i].cls) : /open/.test(ln[i].cls)),
             where + ': window ' + mmss(w) + ' holds ' + n + ' and is ' + (closed ? 'closed' : 'open') + ' (got ' + ln[i].v + ', "' + ln[i].bar + '")');
        });
        await noRaw(where);
      }
      const counts = [0, 60, 120, 180, 240].map(w => run.filter(x => !x.late && x.start === w).length).join(', '), lateIds = run.filter(x => x.late).map(x => x.id);
      const c = (await callouts())[0];
      ok(c.t.includes('With a delay of ' + d + ' s the windows hold ' + counts + ' orders and ' + lateIds.length + ' were dropped') && /the same\./.test(c.t) && /tip/.test(c.cls), 'watermark lab, delay ' + d + ': the final callout agrees with Flink: ' + counts + ', ' + lateIds.length + ' dropped');
      await pick('wm-step', 'reset'); ok((await bigs())[0].b === 'none yet', 'watermark lab, delay ' + d + ': Start again');
      await pick('wm-step', 'all'); ok((await bigs())[2].b === String(lateIds.length), 'watermark lab, delay ' + d + ': All orders drops ' + lateIds.length);
    }
    // by hand, with a delay of 10 s: orders 8, 11 and 14 are late (behind by 70, 72 and 189 seconds), the windows hold 4, 2, 2, 2 and 1
    await pick('wm-d', 10); await pick('wm-step', 'all');
    ok(same(watermarkRun(10).filter(x => x.late).map(x => x.id), [8, 11, 14]), 'watermark lab: by hand, a delay of 10 s drops orders 8, 11 and 14');
    ok((await callouts())[0].t.includes('4, 2, 2, 2, 1 orders and 3 were dropped (orders 8, 11, 14)'), 'watermark lab: the page says 4, 2, 2, 2, 1 and orders 8, 11, 14');
    // step 2: the five runs that Flink printed
    await go(sc.id + ':1');
    const rows = (await tables())[0], DS = T('time.delay_summary').rows;
    ok(rows.length === 5 && rows.every((r, i) => r[0] === DS[i][0] + ' s' && r[1] === DS[i][1] && r[2] === String(DS[i][2]) && r[3] === DS[i][3] + (DS[i][4] ? ' (' + DS[i][4] + ')' : '')), 'watermark lab, step 2: the five runs are the table that Flink printed');
    ok(same(rows.map(r => r[4]), ['#4', '#6', '#7', '#10', 'only at the end']), 'watermark lab, step 2: the first window closes when order #4, #6, #7, #10 arrives, or only at the end (worked out by hand)');
    ok((await callouts())[0].t.includes('from 4 to 1') && (await callouts())[0].t.includes('#10 instead of #4'), 'watermark lab, step 2: the callout says 4 to 1 and order #10 instead of #4');
    await noRaw('watermark lab step 2');
  });

  // ------------------------------------------------------------------------------------------------------------------------------
  // lab 4: the kinds of window. The windows are found by hand from the fourteen times and compared with the page and with what Flink printed.
  // ------------------------------------------------------------------------------------------------------------------------------
  await section('window lab', async () => {
    const sc = await sceneOf('windowlab');
    await go(sc.id + ':0'); await reset('wl');
    ok(same(await chipVals('wl-k'), ['tumble', 'hop', 'cumulate', 'session']), 'window lab offers four kinds');
    const T14 = EVENTS.map(e => e[3]);
    const byStart = f => { const o = {}; f().forEach(([s, e, n, st]) => { const k = (st || '') + '|' + s + '|' + e; o[k] = o[k] || { s, e, n: 0, st }; o[k].n += n; }); return Object.values(o).sort((a, b) => a.s - b.s || a.e - b.e || String(a.st).localeCompare(String(b.st))); };
    const WIN = {
      tumble: byStart(() => T14.map(t => [t - t % 60, t - t % 60 + 60, 1])),
      hop: byStart(() => { const o = []; T14.forEach(t => { for (let s = -30; s <= 300; s += 30) if (t >= s && t < s + 60) o.push([s, s + 60, 1]); }); return o; }),
      cumulate: byStart(() => { const o = []; T14.forEach(t => { const w = t - t % 60; [20, 40, 60].forEach(d => { if (t < w + d) o.push([w, w + d, 1]); }); }); return o; }),
      session: (() => { const out = []; ['s01', 's02'].forEach(st => { let cur = null; EVENTS.filter(e => e[1] === st).sort((a, b) => a[3] - b[3]).forEach(e => { if (cur && e[3] < cur.last + 30) { cur.last = e[3]; cur.n++; } else { cur = { st, s: e[3], last: e[3], n: 1 }; out.push(cur); } }); }); return out.map(c => ({ s: c.s, e: c.last + 30, n: c.n, st: c.st })).sort((a, b) => a.s - b.s || a.e - b.e || a.st.localeCompare(b.st)); })()
    };
    const RECT = { tumble: 'time.tumble_200', hop: 'time.hop', cumulate: 'time.cumulate', session: 'time.session' };
    for (const k of ['tumble', 'hop', 'cumulate', 'session']) {
      await pick('wl-k', k);
      const ws = WIN[k], ln = await lanes(), b = await bigs(), rec = T(RECT[k]).rows;
      ok(ln.length === ws.length, 'window lab, ' + k + ': ' + ws.length + ' windows with orders (got ' + ln.length + ')');
      ok(ln.every((l, i) => l.n === (k === 'session' ? ws[i].st + ' ' : '') + mmss(ws[i].s) + ' to ' + mmss(ws[i].e) && l.v === ws[i].n + ' order' + (ws[i].n > 1 ? 's' : '')), 'window lab, ' + k + ': each window has the start, the end and the count that were worked out by hand');
      ok(b[0].b === String(ws.length) && b[1].b === String(rec.length), 'window lab, ' + k + ': ' + ws.length + ' windows, and Flink printed ' + rec.length);
      ok(same(ws.map(w => w.n).sort((a, b) => a - b), rec.map(r => Number(r[{ tumble: 3, hop: 3, cumulate: 3, session: 4 }[k]])).sort((a, b) => a - b)), 'window lab, ' + k + ': the counts that were worked out by hand are the counts that Flink printed');
      const most = { tumble: 1, hop: 2, cumulate: 3, session: 1 }[k];
      ok(b[2].b === String(most), 'window lab, ' + k + ': the most windows one order is in is ' + most + ' (got ' + b[2].b + ')');
      ok((await callouts())[0].cls.includes('tip'), 'window lab, ' + k + ': the lab agrees with the recording');
      await noRaw('window lab ' + k);
    }
    // by hand: 5 tumbling, 10 hopping, 15 cumulating and 6 session windows
    ok(same(Object.keys(WIN).map(k => WIN[k].length), [5, 10, 15, 6]), 'window lab: by hand 5, 10, 15 and 6 windows');
    await pick('wl-k', 'hop');
    ok((await lanes())[0].n === '-00:30 to 00:30' && (await lanes())[0].v === '2 orders', 'window lab: the first hopping window starts before the first order and holds 2 orders');
    await pick('wl-k', 'tumble');
    ok(same((await lanes()).map(l => l.v), ['5 orders', '4 orders', '2 orders', '2 orders', '1 order']), 'window lab: the tumbling windows hold 5, 4, 2, 2 and 1 orders');
  });

  // ------------------------------------------------------------------------------------------------------------------------------
  // lab 5: a checkpoint, a crash and a replay, for a sink that writes at once and for a transactional sink
  // ------------------------------------------------------------------------------------------------------------------------------
  await section('checkpoint lab', async () => {
    const sc = await sceneOf('checkpointlab');
    await go(sc.id + ':0'); await reset('cp');
    ok(same(await chipVals('cp-mode'), ['alo', 'eo']), 'checkpoint lab offers two sinks');
    const act = async a => { await pick('cp-do', a); };
    const visible = async () => ((await strips()).find((s, i) => i === 1) || []).map(r => r.t.replace('#', ''));
    for (const mode of ['alo', 'eo']) {
      await pick('cp-mode', mode); await go(sc.id + ':0');
      const b0 = await bigs();
      ok(b0[0].b === '0' && b0[1].b === 'none yet' && b0[2].b === '0' && b0[3].b === '0' && b0[4].b === '0', 'checkpoint lab, ' + mode + ': nothing yet');
      for (let i = 0; i < 5; i++) await act('process');
      let b = await bigs(), s = await strips();
      ok(b[0].b === '5' && s[0].filter(r => /right/.test(r.cls)).length === 5, 'checkpoint lab, ' + mode + ': after 5 records the counter is 5 and the source is at record 5');
      ok(mode === 'alo' ? same(await visible(), ['1', '2', '3', '4', '5']) && b[2].b === '5' : (await visible()).length === 0 && b[2].b === '0', 'checkpoint lab, ' + mode + ': the reader sees ' + (mode === 'alo' ? '1 to 5 at once' : 'nothing yet: the records wait in an open transaction'));
      if (mode === 'eo') ok(same(s[2].map(r => r.t), ['#1', '#2', '#3', '#4', '#5']), 'checkpoint lab, eo: records 1 to 5 wait in the open transaction');
      await act('checkpoint'); b = await bigs();
      ok(b[1].b === 'record 5, counter 5' && b[1].s.includes('#1') && b[2].b === '5', 'checkpoint lab, ' + mode + ': checkpoint #1 saved record 5 and counter 5; the reader sees 5 records');
      for (let i = 0; i < 3; i++) await act('process');
      await act('crash'); b = await bigs(); s = await strips();
      ok(b[0].b === '5' && s[0].filter(r => /right/.test(r.cls)).length === 5, 'checkpoint lab, ' + mode + ': after the crash the counter and the source are back at 5');
      if (mode === 'alo') ok(same(await visible(), ['1', '2', '3', '4', '5', '6', '7', '8']) && b[2].b === '8' && b[3].b === '0', 'checkpoint lab, alo: records 6, 7 and 8 were written before the crash and stay');
      else ok(same(await visible(), ['1', '2', '3', '4', '5']) && b[4].b === '3' && same(s[s.length - 1].map(r => r.t), ['#6', '#7', '#8']), 'checkpoint lab, eo: records 6, 7 and 8 were aborted, and nobody saw them');
      for (let i = 0; i < 7; i++) await act('process');
      await act('checkpoint'); b = await bigs();
      const dups = mode === 'alo' ? 3 : 0, seen = mode === 'alo' ? 15 : 12;
      ok(b[2].b === String(seen) && b[3].b === String(dups) && b[4].b === (mode === 'alo' ? '0' : '3'), 'checkpoint lab, ' + mode + ': at the end the reader sees ' + seen + ' records, ' + dups + ' of them twice (got ' + b.slice(2).map(x => x.b).join(' / ') + ')');
      ok(b[0].b === '12', 'checkpoint lab, ' + mode + ': the counter is right either way, 12');
      ok((await callouts()).some(c => dups ? c.t.includes('3 records twice') : c.t.includes('every record is in the sink once')), 'checkpoint lab, ' + mode + ': the callout says ' + (dups ? '3 records twice' : 'every record once'));
      if (mode === 'alo') ok(same(await visible(), ['1', '2', '3', '4', '5', '6', '7', '8', '6', '7', '8', '9', '10', '11', '12']), 'checkpoint lab, alo: the reader sees 6, 7 and 8 twice');
      await noRaw('checkpoint lab ' + mode);
      // the button that runs the whole example gives the same end state
      await act('reset'); await act('script'); const e = await bigs();
      ok(e[2].b === String(seen) && e[3].b === String(dups), 'checkpoint lab, ' + mode + ': Run the example gives ' + seen + ' records and ' + dups + ' duplicates');
      await act('reset');
    }
    await go(sc.id + ':1');
    const t = (await tables())[0], AL = C('state.copy_alo'), EO = C('state.copy_eo');
    ok(same(t.map(r => r.slice(1)), [[AL.orders_sent, EO.orders_sent], [fmtN(AL.records_a_read_committed_reader_sees), fmtN(EO.records_a_read_committed_reader_sees)], [fmtN(AL.distinct_orders), fmtN(EO.distinct_orders)],
      [AL.duplicates, EO.duplicates], [AL.missing, EO.missing], [AL.records_of_aborted_transactions, EO.records_of_aborted_transactions]].map(r => r.map(String))), 'checkpoint lab, step 2: the table is the recorded kill of a TaskManager');
    ok(AL.duplicates > 0 && EO.duplicates === 0 && EO.records_of_aborted_transactions > 0, 'recorded: duplicates with at least once, none and aborted records with exactly once');
    ok((await callouts())[0].t.includes(String(AL.duplicates) + ' duplicates') && (await callouts())[0].t.includes(String(EO.records_of_aborted_transactions) + ' records of an aborted transaction'), 'checkpoint lab, step 2: the callout quotes the recorded numbers');
    await noRaw('checkpoint lab step 2');
  });

  // ------------------------------------------------------------------------------------------------------------------------------
  // lab 6: the state of three joins, checkpoint by checkpoint, and the arithmetic for an hour and a day
  // ------------------------------------------------------------------------------------------------------------------------------
  await section('state lab', async () => {
    const sc = await sceneOf('statelab');
    await go(sc.id + ':0'); await reset('sl');
    const ST = T('joins.state_size').rows, SER = { regular: ST.map(r => r[1]), interval: ST.map(r => r[2]), ttl: ST.map(r => r[3]) };
    ok(same(await chipVals('sl-k'), ['regular', 'interval', 'ttl']) && same(await chipVals('sl-r'), ['100', '200', '400']), 'state lab offers three joins and three rates');
    const grow = (SER.regular[8] - SER.regular[0]) / 16, mx = Math.max(...SER.regular);
    for (const k of ['regular', 'interval', 'ttl']) {
      await pick('sl-k', k);
      let ln = await lanes();
      ok(ln.length === 9 && ln.every((l, i) => l.n === 'Checkpoint ' + (i + 1) + ' (' + 2 * (i + 1) + ' s)'), 'state lab, ' + k + ': nine checkpoints, one every two seconds');
      ok(ln.filter(l => l.v).length === 1 && ln[0].v === mb(SER[k][0]), 'state lab, ' + k + ': first only checkpoint 1 is shown, ' + mb(SER[k][0]));
      for (let c = 2; c <= 9; c++) {
        await pick('sl-c', 'next'); ln = await lanes(); const b = await bigs();
        ok(ln.filter(l => l.v).length === c && ln[c - 1].v === mb(SER[k][c - 1]) && b[0].b === mb(SER[k][c - 1]), 'state lab, ' + k + ' after checkpoint ' + c + ': the state is ' + mb(SER[k][c - 1]) + ' (got ' + b[0].b + ')');
      }
      ok(await disabled('sl-c', 'next'), 'state lab, ' + k + ': the next button is disabled after the ninth checkpoint');
      ln = await lanes(); const wid = await page.$$eval('.lab .gbar', els => els.map(e => parseFloat(e.style.width)));
      ok(wid.every((w, i) => Math.abs(w - SER[k][i] / mx * 100) < 0.01), 'state lab, ' + k + ': every bar is as long as its state against the biggest state of the unbounded join');
      const b = await bigs();
      ok(b[1].b === (k === 'regular' ? mb(grow) + ' a second' : 'flat'), 'state lab, ' + k + ': growth ' + (k === 'regular' ? mb(grow) + ' a second' : 'flat') + ' (got ' + b[1].b + ')');
      await pick('sl-c', 'reset'); ok((await lanes()).filter(l => l.v).length === 1, 'state lab, ' + k + ': Start again shows one checkpoint');
      await pick('sl-c', 'all'); ok((await lanes()).filter(l => l.v).length === 9, 'state lab, ' + k + ': Show all nine');
      for (const rate of [100, 200, 400]) {
        await pick('sl-r', rate);
        const t = (await tables())[0], f = rate / 200, hour = grow * f * 3600, day = grow * f * 86400;
        ok(same(t, [['1 hour', mb(hour), mb(Math.max(...SER.interval) * f), mb(Math.max(...SER.ttl) * f)], ['1 day', mb(day), mb(Math.max(...SER.interval) * f), mb(Math.max(...SER.ttl) * f)]]), 'state lab, ' + k + ', ' + rate + ' rows a second: the table for an hour and a day (got ' + JSON.stringify(t[0]) + ')');
        await noRaw('state lab ' + k + ' ' + rate);
      }
      await pick('sl-r', 200);
    }
    // by hand: the join with no bound grows by 88,000 bytes at every checkpoint of two seconds: 44,000 a second, 151 MiB an hour at 200 rows a second on each side
    ok(SER.regular.slice(1).every((v, i) => v - SER.regular[i] === 88000), 'recorded: the unbounded join grew by exactly 88,000 bytes at every checkpoint');
    await pick('sl-k', 'regular'); await pick('sl-c', 'all'); await pick('sl-r', 200);
    ok((await tables())[0][0][1] === mb(44000 * 3600) && mb(44000 * 3600) === '151.1 MiB', 'state lab: an hour at the recorded rate is 151.1 MiB (44,000 bytes a second)');
    await pick('sl-r', 400);
    ok((await tables())[0][0][1] === '302.1 MiB', 'state lab: twice the rate is 302.1 MiB an hour');
  });

  // ------------------------------------------------------------------------------------------------------------------------------
  // lab 7: which task holds a key. The Java hash code, Flink's murmur hash, the key group and the task are worked out here with BigInt and compared with the page and with
  // KeyGroupRangeAssignment, which Flink itself printed.
  // ------------------------------------------------------------------------------------------------------------------------------
  await section('key group lab', async () => {
    const sc = await sceneOf('keygrouplab');
    await go(sc.id + ':0'); await reset('kg');
    const M32 = 0xffffffffn, toInt = x => Number(BigInt.asIntN(32, x)), rotl = (x, r) => ((x << BigInt(r)) | (x >> BigInt(32 - r))) & M32;
    const bitMix = x => { x ^= x >> 16n; x = (x * 0x85ebca6bn) & M32; x ^= x >> 13n; x = (x * 0xc2b2ae35n) & M32; x ^= x >> 16n; return x; };
    const murmur = code => { let x = BigInt.asUintN(32, BigInt(code)); x = (x * 0xcc9e2d51n) & M32; x = rotl(x, 15); x = (x * 0x1b873593n) & M32; x = rotl(x, 13); x = (x * 5n + 0xe6546b64n) & M32; x ^= 4n; const v = toInt(bitMix(x)); return v >= 0 ? v : v !== -2147483648 ? -v : 0; };
    const jh = s => { let h = 0n; for (const ch of s) h = (h * 31n + BigInt(ch.charCodeAt(0))) & M32; return toInt(h); };
    const KG = T('datastream.key_groups').rows, OPS = T('datastream.orders_per_store').rows;
    ok(same(await chipVals('kg-p'), ['2', '3', '4']) && same(await chipVals('kg-k'), STORES), 'key group lab offers parallelism 2, 3 and 4 and the twelve stores');
    ok(jh('s01') === 112052 && jh('s01') === (115 * 31 + 48) * 31 + 49, 'by hand: the Java hash code of "s01" is (115*31+48)*31+49 = 112052');
    for (const p of [2, 3, 4]) {
      await pick('kg-p', p);
      const held = Array.from({ length: p }, () => ({ stores: [], orders: 0 }));
      STORES.forEach(s => { const kg = murmur(jh(s)) % 128, t = Math.floor(kg * p / 128); held[t].stores.push(s); held[t].orders += OPS.find(r => r[0] === s)[1]; });
      for (const s of STORES) {
        await pick('kg-k', s);
        const t = (await tables())[0], h = jh(s), m = murmur(h), kg = m % 128, task = Math.floor(kg * p / 128), rec = KG.find(r => r[0] === s), where = 'key group lab, ' + s + ' at parallelism ' + p;
        ok(same(t.map(r => r[1]), [String(h), String(m), String(kg), String(task)]), where + ': hash code ' + h + ', murmur ' + m + ', key group ' + kg + ', task ' + task + ' (got ' + t.map(r => r[1]).join(', ') + ')');
        ok(rec[1] === kg && rec[1 + p - 1] === task || rec[p] === task, where + ': Flink\'s own KeyGroupRangeAssignment printed key group ' + rec[1] + ' and task ' + rec[p]);
        ok(t[3][0].includes(String(p)) && t[3][0].includes('128'), where + ': the last step names the parallelism and 128');
      }
      const boxes = await page.$$eval('.slotbox', bs => bs.map(b => ({ name: b.querySelector('b').textContent, stores: [...b.querySelectorAll('.task')].map(t => t.textContent), bar: b.querySelector('.lane-v').textContent })));
      ok(boxes.length === p && boxes.every((b, i) => b.name === 'Task ' + i && same(b.stores, held[i].stores) && b.bar === fmtN(held[i].orders) + ' of 1,200'), 'key group lab, parallelism ' + p + ': the tasks hold the stores and the orders that were worked out by hand (got ' + JSON.stringify(boxes.map(b => b.bar)) + ')');
      ok(held.reduce((a, x) => a + x.orders, 0) === 1200 && held.reduce((a, x) => a + x.stores.length, 0) === 12, 'key group lab, parallelism ' + p + ': 12 stores and 1,200 orders in all');
      const t0 = held.map(x => x.orders), busiest = Math.max(...t0);
      ok((await callouts())[0].t.includes('busiest task gets ' + fmtN(busiest) + ' of the 1,200'), 'key group lab, parallelism ' + p + ': the busiest task gets ' + fmtN(busiest));
      ok((await labText()).includes('gets the same answer for all twelve stores at 2, 3 and 4'), 'key group lab: the page says that its own hash gives the recorded answer');
      await noRaw('key group lab ' + p);
    }
  });

  // ------------------------------------------------------------------------------------------------------------------------------
  // lab 8: backpressure. A step of ms milliseconds a record does 1000/ms records a second in each task; the job gets through the smaller of that and what the source offers.
  // ------------------------------------------------------------------------------------------------------------------------------
  await section('backpressure lab', async () => {
    const sc = await sceneOf('backpressurelab');
    await go(sc.id + ':0'); await reset('bp');
    ok(same(await chipVals('bp-r'), ['500', '5000', 'max']) && same(await chipVals('bp-ms'), ['1', '10', '20']) && same(await chipVals('bp-p'), ['1', '2', '4', '8']), 'backpressure lab offers 3 source speeds, 3 step times and 4 task counts');
    ok(same(await chipOn('bp-r'), ['max']) && same(await chipOn('bp-ms'), ['10']) && same(await chipOn('bp-p'), ['1']), 'backpressure lab starts with the recorded run: a fast source, 10 ms, one task');
    const RATE = { '500': 500, '5000': 5000, max: 100000 };
    for (const r of ['500', '5000', 'max']) for (const ms of [1, 10, 20]) for (const p of [1, 2, 4, 8]) {
      await pick('bp-r', r); await pick('bp-ms', ms); await pick('bp-p', p);
      const rate = RATE[r], cap = p * 1000 / ms, thr = Math.min(rate, cap), blocked = rate > cap ? Math.round((1 - thr / rate) * 1000) : 0, busy = Math.round(thr / cap * 1000), lag = Math.max(0, rate - thr);
      const b = await bigs(), where = 'backpressure lab, source ' + r + ', ' + ms + ' ms, ' + p + ' task(s)';
      ok(b[0].b === fmtN(Math.round(thr)) + ' a second' && b[1].b === fmtN(Math.round(cap)) + ' a second' && b[2].b === (lag ? fmtN(Math.round(lag)) + ' a second' : 'none'), where + ': gets through ' + fmtN(thr) + ', can do ' + fmtN(cap) + ', lag ' + (lag ? fmtN(lag) : 'none') + ' (got ' + b.map(x => x.b).join(' / ') + ')');
      const boxes = await page.$$eval('.pipe-box', bs => bs.map(x => x.innerText.replace(/\s+/g, ' ').trim()));
      ok(boxes[0] === 'Source blocked ' + Math.round(blocked / 10) + ' percent' && boxes[1] === 'Slow step x' + p + ' busy ' + Math.round(busy / 10) + ' percent' && boxes[2] === 'Sink idle', where + ': the three boxes (got ' + JSON.stringify(boxes) + ')');
      const ln = await lanes();
      ok(ln[0].v === Math.round(blocked / 10) + ' percent' && ln[1].v === Math.round(busy / 10) + ' percent', where + ': the two bars');
      const c = (await callouts())[0];
      ok(blocked > 500 ? /warn/.test(c.cls) && c.t.includes('is blocked most of the time') : /tip/.test(c.cls) && c.t.includes('can keep up'), where + ': the callout says ' + (blocked > 500 ? 'blocked' : 'that the step keeps up'));
      await noRaw(where);
    }
    // by hand: the recorded runs. One task of 10 ms does at most 100 a second, four tasks 400; Flink measured 98 and 395.
    await pick('bp-r', 'max'); await pick('bp-ms', 10); await pick('bp-p', 1);
    ok((await bigs())[1].b === '100 a second' && (await bigs())[2].b === '99,900 a second', 'backpressure lab: one task of 10 ms can do 100 a second, and a source of 100,000 gains 99,900 a second of lag');
    await pick('bp-p', 4);
    ok((await bigs())[1].b === '400 a second', 'backpressure lab: four tasks can do 400 a second');
    const note = await labText();
    ok(note.includes('With one task Flink got ' + C('running.rate_p1').records_per_second + ' records a second') && note.includes('with four tasks ' + C('running.rate_p4').records_per_second), 'backpressure lab: the note quotes the recorded 98 and 395 (' + C('running.rate_p1').records_per_second + ', ' + C('running.rate_p4').records_per_second + ')');
    await pick('bp-r', '500'); await pick('bp-ms', 10); await pick('bp-p', 8);
    ok((await bigs())[2].b === 'none', 'backpressure lab: eight tasks of 10 ms keep up with 500 a second');
  });

  // ------------------------------------------------------------------------------------------------------------------------------
  // the labs keep working after all of that, and no step raised an error
  // ------------------------------------------------------------------------------------------------------------------------------
  const ws = await page.evaluate(() => { const o = []; LAB.chapters.forEach(c => c.scenes.forEach(s => { if (s.type === 'widget') o.push([s.id, LAB.R.widget.steps(s)]); })); return o; });
  ok(ws.length === 8, 'the course has 8 labs, found ' + ws.length);
  for (const [id, n] of ws) for (let i = 0; i < n; i++) {
    await go(id + ':' + i);
    ok(await page.$eval('.lab', e => e.innerText.length > 40), 'lab ' + id + ' step ' + (i + 1) + ' renders');
    await noRaw('lab ' + id + ' step ' + (i + 1));
  }
  ok(errs.length === 0, 'no console or page errors: ' + errs.slice(0, 3).join(' | '));

  console.log(pass + ' checks passed' + (fail ? ', ' + fail + ' failed' : ''));
  await browser.close(); srv.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
