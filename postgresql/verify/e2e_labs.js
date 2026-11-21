// End-to-end test of the 6 labs of the PostgreSQL course, in a real browser.
// It opens postgresql/index.html, clicks every chip of every lab, and compares what the page shows with
//   (a) what was recorded (postgresql/js/real.js), and
//   (b) values that are worked out in this file: the size of a file in megabytes, the colour that follows from a number, the rows written that a command tag implies, which
//       session blocks which, and the statuses that a slot may have.
// Nothing is read from the widget code. A lab that shows a wrong number or a stale label fails here, even when the data behind it passes verify/check_widgets.js.
// No step may show an HTML tag, backticks, asterisks, "undefined" or "NaN" as text.
// Needs Playwright:  npm install playwright && npx playwright install chromium
// Run: node postgresql/verify/e2e_labs.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + '\n   got  ' + JSON.stringify(a) + '\n   want ' + JSON.stringify(b));
const n = v => Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 });
const mbs = x => (x / 1048576).toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' MB';

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
  await page.addInitScript(() => { try { localStorage.setItem('dep.postgresql.v1', JSON.stringify({ track: 'all', chosen: true })); } catch (e) { /* ignore */ } });
  await page.goto('http://127.0.0.1:' + srv.address().port + '/postgresql/index.html'); await page.waitForTimeout(300);

  const REAL = await page.evaluate(() => LAB.real), C = k => REAL.counts[k], T = k => REAL.tables[k], X = k => REAL.text[k];
  const sceneOf = kind => page.evaluate(k => { let f = null; LAB.chapters.forEach(c => c.scenes.forEach(s => { if (s.type === 'widget' && s.kind === k) f = s.id; })); return f; }, kind);
  const open = async kind => { const id = await sceneOf(kind); ok(!!id, 'the course has a lab of kind ' + kind); await page.evaluate(k => { location.hash = k + ':0'; }, id); await page.waitForTimeout(60); };
  const pick = async (act, v) => { await page.click('[data-act="' + act + '"][data-v="' + v + '"]'); await page.waitForTimeout(12); };
  const bigs = () => page.$$eval('.lab .big', els => els.map(e => [e.querySelector('b').textContent, e.querySelector('span').textContent, e.className.replace('big', '').trim()]));
  const tables = () => page.$$eval('.lab .tbl', ts => ts.map(t => [...t.querySelectorAll('tbody tr')].map(r => [...r.children].map(td => td.innerText.trim()))));
  const chipOn = act => page.$$eval('[data-act="' + act + '"].on', els => els.map(e => e.getAttribute('data-v')));
  const chipVals = act => page.$$eval('[data-act="' + act + '"]', els => els.map(e => e.getAttribute('data-v')));
  const chipTexts = act => page.$$eval('[data-act="' + act + '"]', els => els.map(e => e.innerText.trim()));
  const callouts = () => page.$$eval('.lab .callout', els => els.map(e => [e.className.replace('callout', '').trim(), e.innerText.replace(/\s+/g, ' ').trim()]));
  const lanes = () => page.$$eval('.lab .lane', els => els.map(l => [l.querySelector('.lane-n').textContent, l.querySelector('.lane-v').textContent, l.querySelector('i').className.trim(), l.querySelector('i').getAttribute('style')]));
  const pres = () => page.$$eval('.lab pre', els => els.map(e => e.innerText.replace(/\n+$/, '')));
  const notes = () => page.$eval('.lab .lab-note', e => e.innerText.replace(/\s+/g, ' ').trim());
  const noRaw = async where => { const t = await page.$eval('.lab', el => el.innerText); ok(!/[`]|\*\*|<\/?[a-z][a-z0-9]*[ >]|undefined|NaN|\[object Object\]/.test(t), where + ' shows no raw markup, undefined or NaN: ' + (t.match(/.{0,30}([`]|\*\*|<\/?[a-z][a-z0-9]*[ >]|undefined|NaN|\[object Object\]).{0,30}/) || [''])[0]); };
  const section = async (name, fn) => { try { await fn(); } catch (e) { fail++; console.log('FAIL:', name, 'threw', String(e.message).split('\n')[0]); } };

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 1: a table that is updated again and again
  await section('bloat lab', async () => {
    await open('bloat');
    const rows = T('mvcc.bloat').rows, start = rows[0][1];
    eq(await chipVals('bl-k'), rows.map((r, i) => String(i)), 'bloat lab: one chip for each of the seven steps');
    eq((await chipTexts('bl-k')).map(t => t.replace(/^\d+\. /, '')), rows.map(r => r[0]), 'bloat lab: the chips carry the names of the steps');
    const kinds = ['good', 'warn', 'warn', 'bad', 'tip', 'tip', 'good'];
    for (let i = 0; i < rows.length; i++) {
      await pick('bl-k', String(i));
      const [name, bytes, , live, dead, , free, pk] = rows[i];
      eq(await chipOn('bl-k'), [String(i)], 'bloat lab: step ' + (i + 1) + ' is selected');
      const L = await lanes();
      eq(L.map(l => l[1]), [mbs(bytes), n(dead), free + ' %'], 'bloat lab, step ' + (i + 1) + ': the three bars');
      eq(L.map(l => l[2]), [bytes > start * 1.5 ? 'bad' : 'good', dead ? 'bad' : 'good', free > 20 ? 'warn' : 'good'], 'bloat lab, step ' + (i + 1) + ': the colours of the bars follow the numbers');
      const w = L.map(l => +/width:([\d.]+)%/.exec(l[3])[1]), max = Math.max(...rows.map(r => r[1]));
      ok(Math.abs(w[0] - bytes / max * 100) < 0.01 && Math.abs(w[1] - Math.min(100, Math.max(1, dead / 100000 * 100))) < 0.01 && Math.abs(w[2] - Math.max(1, free)) < 0.01, 'bloat lab, step ' + (i + 1) + ': the bars are in proportion: ' + w.join(', '));
      const b = await bigs();
      eq(b.map(x => x[0]), [live ? n(live) : '0', n(dead), free + ' %', mbs(pk)], 'bloat lab, step ' + (i + 1) + ': the four numbers');
      eq(b.map(x => x[2]), ['', dead ? 'warn' : 'good', free > 20 ? 'warn' : '', ''], 'bloat lab, step ' + (i + 1) + ': the colours of the numbers');
      eq((await callouts())[0][0], kinds[i], 'bloat lab, step ' + (i + 1) + ': the callout kind');
      await noRaw('bloat lab, step ' + (i + 1));
    }
    await pick('bl-k', '4'); ok(/did not get smaller/.test((await callouts())[0][1]), 'bloat lab: after VACUUM the text says that the file did not get smaller');
    await pick('bl-k', '6'); ok(/exclusive lock/.test((await callouts())[0][1]), 'bloat lab: VACUUM FULL says that it holds an exclusive lock');
  });

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 2: four ways to load 20,000 rows
  await section('load lab', async () => {
    await open('loadlab');
    const rows = T('load.methods').rows, maxS = Math.max(...rows.map(r => r[5]));
    eq(await chipVals('lm-k'), ['0', '1', '2', '3'], 'load lab: four methods');
    eq(await chipTexts('lm-k'), rows.map(r => r[0]), 'load lab: the chips are the methods');
    for (let i = 0; i < 4; i++) {
      await pick('lm-k', String(i));
      const [, stm, com, wal, fl, sec, nr] = rows[i];
      eq(await chipOn('lm-k'), [String(i)], 'load lab: method ' + (i + 1) + ' is selected');
      const b = await bigs();
      eq(b.map(x => x[0]), [n(stm), n(com), n(fl), mbs(wal), n(nr)], 'load lab, method ' + (i + 1) + ': the five numbers');
      eq(b.map(x => x[2]), [stm > 1000 ? 'warn' : 'good', com > 1000 ? 'warn' : 'good', fl > 1000 ? 'bad' : 'good', '', ''], 'load lab, method ' + (i + 1) + ': the colours follow the numbers');
      const L = (await lanes())[0];
      eq([L[1], L[2]], [sec.toLocaleString('en-US', { minimumFractionDigits: 2 }) + ' s', sec > 1 ? 'bad' : 'good'], 'load lab, method ' + (i + 1) + ': the seconds and their colour');
      ok(Math.abs(+/width:([\d.]+)%/.exec(L[3])[1] - Math.max(1, sec / maxS * 100)) < 0.01, 'load lab, method ' + (i + 1) + ': the bar is in proportion to the slowest');
      eq((await callouts())[0][0], ['bad', 'tip', 'tip', 'good'][i], 'load lab, method ' + (i + 1) + ': the callout kind');
      if (i === 0) ok(fl === com, 'load lab: with a commit for each row, the log was flushed once for each commit (' + fl + ' and ' + com + ')');
      await noRaw('load lab, method ' + (i + 1));
    }
    await pick('lm-k', '3'); ok(/one statement/.test((await callouts())[0][1]) && /all or nothing|stops the whole/.test((await callouts())[0][1]), 'load lab: COPY says one statement and all or nothing');
  });

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 3: six runs of an upsert
  await section('upsert lab', async () => {
    await open('upsert');
    const rows = T('load.upsert').rows, first = rows[0][4], maxB = Math.max(...rows.map(r => r[4]));
    eq(await chipVals('up-k'), rows.map((r, i) => String(i)), 'upsert lab: six runs');
    eq((await chipTexts('up-k')).map(t => t.replace(/^\d+\. /, '')), rows.map(r => r[0]), 'upsert lab: the chips carry the names of the runs');
    const kinds = ['good', 'bad', 'good', 'good', 'good', 'good'];
    for (let i = 0; i < rows.length; i++) {
      await pick('up-k', String(i));
      const [name, tag, ins, upd, bytes] = rows[i];
      eq(await chipOn('up-k'), [String(i)], 'upsert lab: run ' + (i + 1) + ' is selected');
      eq((await pres())[0], '-- ' + name + '\n' + tag, 'upsert lab, run ' + (i + 1) + ': the name of the run and the command tag');
      eq(+/(\d+)$/.exec(tag)[1], ins + upd, 'upsert lab, run ' + (i + 1) + ': the number in the tag is the rows inserted and updated');
      const b = await bigs();
      eq(b.map(x => x[0]), [n(ins), n(upd), mbs(bytes)], 'upsert lab, run ' + (i + 1) + ': the three numbers');
      eq(b.map(x => x[2]), ['', upd > 5000 ? 'bad' : upd ? 'warn' : 'good', bytes > first * 1.5 ? 'bad' : 'good'], 'upsert lab, run ' + (i + 1) + ': the colours follow the numbers');
      const L = (await lanes())[0]; ok(Math.abs(+/width:([\d.]+)%/.exec(L[3])[1] - bytes / maxB * 100) < 0.01, 'upsert lab, run ' + (i + 1) + ': the size bar is in proportion');
      eq((await callouts())[0][0], kinds[i], 'upsert lab, run ' + (i + 1) + ': the callout kind');
      await noRaw('upsert lab, run ' + (i + 1));
    }
    await pick('up-k', '1'); ok(/twice|doubled|\*\*twice\*\*/i.test((await callouts())[0][1]) || /twice/.test((await callouts())[0][1]), 'upsert lab: the plain rerun says that the table is twice the size');
    await pick('up-k', '2'); ok(/0 rows/.test((await callouts())[0][1]), 'upsert lab: the guarded rerun writes 0 rows');
  });

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 4: which index for which question
  await section('index lab', async () => {
    await open('indexlab');
    const keys = ['brin', 'shuffled', 'partial', 'covering', 'jsonb', 'stats'];
    eq(await chipVals('ix-k'), keys, 'index lab: six questions');
    const BR = C('idx.brin'), PA = C('idx.partial'), IO = C('idx.index_only'), JS = C('idx.jsonb'), ST = C('idx.stats');
    const want = {
      brin: { nums: [BR.btree_mb + ' MB', BR.brin_kb + ' KB', BR.btree_over_brin + ' x'], plan: [X('idx.plan_brin')], has: ['Bitmap Index Scan on events_ts_brin', 'Rows Removed by Index Recheck: ' + BR.recheck_removed], kind: 'good' },
      shuffled: { nums: [String(BR.correlation_shuffled), BR.shuffled_plan_uses_brin ? 'BRIN' : 'sequential scan'], plan: [X('idx.plan_brin_shuffled')], has: ['Seq Scan on events_shuffled'], kind: 'bad' },
      partial: { nums: [PA.full_mb + ' MB', PA.partial_kb + ' KB', PA.times_smaller + ' x'], plan: [X('idx.plan_partial')], has: ['events_user_purchase'], kind: 'good' },
      covering: { nums: ['0 of ' + n(IO.pages), n(IO.all_visible_pages_after), String(IO.heap_fetches_after)], plan: [X('idx.plan_ios_before'), X('idx.plan_ios_after')], has: ['Index Only Scan using events_user_inc', 'Heap Fetches: 0'], kind: 'good' },
      jsonb: { nums: [JS.gin_mb + ' MB', 'used', 'not used', 'used'], plan: [X('idx.plan_gin'), X('idx.plan_jsonb_arrow'), X('idx.plan_jsonb_expr')], has: ['events_payload_gin', 'Seq Scan on events', 'events_n_expr'], kind: 'good' },
      stats: { nums: [String(ST.estimate_before), String(ST.estimate_after), String(ST.actual)], plan: [X('idx.plan_stats_before'), X('idx.plan_stats_after')], has: ['rows=' + ST.estimate_before + ' width', 'rows=' + ST.estimate_after + ' width', 'actual rows=' + ST.actual], kind: 'good' }
    };
    for (const k of keys) {
      await pick('ix-k', k);
      eq(await chipOn('ix-k'), [k], 'index lab: ' + k + ' is selected');
      const w = want[k], b = await bigs();
      eq(b.map(x => x[0]), w.nums, 'index lab, ' + k + ': the numbers');
      const p = (await pres())[0];
      w.plan.forEach(t => ok(p.indexOf(t.split('\n')[1]) >= 0, 'index lab, ' + k + ': the screen holds the recorded plan'));
      w.has.forEach(h => ok(p.indexOf(h) >= 0, 'index lab, ' + k + ': the plan holds "' + h + '"'));
      eq((await callouts())[0][0], w.kind, 'index lab, ' + k + ': the callout kind');
      await noRaw('index lab, ' + k);
    }
    await pick('ix-k', 'brin'); const b0 = await bigs(); eq(b0.map(x => x[2]), ['', 'good', ''], 'index lab: the BRIN size is marked good');
    await pick('ix-k', 'jsonb'); const b1 = await bigs(); eq(b1.map(x => x[2]), ['', 'good', 'bad', 'good'], 'index lab: ->> with GIN is marked bad, the other two good');
    ok(JS.contain_uses_gin && !JS.arrow_uses_gin && JS.expr_uses_index, 'index lab: the three claims of the JSONB case are those of the recording');
  });

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 5: the queue behind a migration. Who blocks whom is read from the table that was recorded.
  await section('queue lab', async () => {
    await open('queuelab');
    eq(await chipVals('qu-k'), ['ab', 'abc', 'timeout'], 'queue lab: three moments');
    const T0 = T('ops.queue'), MT = C('ops.migration_timeout');
    await pick('qu-k', 'ab');
    let t = (await tables())[0];
    eq(t.map(r => [r[0], r[4]]), [['A', '-'], ['B', 'A']], 'queue lab, A reads and B migrates: B waits for A');
    eq(t.map(r => r[2]), ['idle in transaction', 'active'], 'queue lab: A is idle in its transaction and B is active');
    let b = await bigs(); eq([b[0][0], b[1][0], b[0][2]], ['waits', 'A', 'warn'], 'queue lab, step 1: B waits for A');
    eq((await callouts())[0][0], 'warn', 'queue lab, step 1: the callout kind');
    await pick('qu-k', 'abc');
    t = (await tables())[0];
    eq(t.map(r => [r[0], r[4]]), [['A', '-'], ['B', 'A'], ['C', 'B']], 'queue lab, C arrives: C waits for B and not for A');
    eq(t.map(r => r[3].replace(/\s+/g, ' ')), T0.rows.map(r => r[3]), 'queue lab: what each session waits for is what was recorded');
    b = await bigs(); eq([b[0][0], b[1][0], b[0][2]], ['waits', 'B', 'bad'], 'queue lab, step 2: C waits for B');
    eq((await callouts())[0][0], 'bad', 'queue lab, step 2: the callout kind');
    const rowCls = await page.$$eval('.lab .tbl tbody tr', rs => rs.map(r => r.className));
    eq(rowCls, ['', 'dup', 'dup'], 'queue lab: the two blocked sessions are marked');
    await pick('qu-k', 'timeout');
    eq((await tables()).length, 0, 'queue lab: with a lock timeout there is no queue to show');
    const p = (await pres())[0]; ok(/lock_timeout = '300ms'/.test(p) && /canceling statement due to lock timeout/.test(p), 'queue lab: the lock timeout and the refusal are on screen');
    b = await bigs(); eq([b[0][0], b[1][0], b[0][2]], [MT.refused ? 'refused' : 'ran', MT.reader_not_blocked ? 'at once' : 'late', 'good'], 'queue lab, step 3: B is refused and the reader is not blocked');
    eq((await callouts())[0][0], 'good', 'queue lab, step 3: the callout kind');
    await noRaw('queue lab');
  });

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 6: a replication slot that nobody reads
  await section('slot lab', async () => {
    await open('slotlab');
    const rows = T('repl.slots').rows;
    eq(await chipVals('sl-k'), ['0', '1', '2'], 'slot lab: three states');
    eq(await chipTexts('sl-k'), rows.map(r => r[0]), 'slot lab: the chips carry the names of the states');
    for (let i = 0; i < 3; i++) {
      await pick('sl-k', String(i));
      const [, active, status, mb] = rows[i], b = await bigs();
      eq(b.map(x => x[0]), [active ? 'yes' : 'no', status, typeof mb === 'number' ? mb + ' MB' : 'none'], 'slot lab, state ' + (i + 1) + ': the three numbers');
      eq(b.map(x => x[2]), [active ? 'good' : 'bad', status === 'reserved' ? 'good' : 'bad', typeof mb === 'number' && mb > 50 ? 'bad' : ''], 'slot lab, state ' + (i + 1) + ': the colours follow the numbers');
      const L = await lanes(); eq(L.length, typeof mb === 'number' ? 1 : 0, 'slot lab, state ' + (i + 1) + ': a bar when a number of megabytes is known');
      if (typeof mb === 'number') ok(Math.abs(+/width:([\d.]+)%/.exec(L[0][3])[1] - Math.max(1, Math.min(100, mb / 80 * 100))) < 0.01, 'slot lab, state ' + (i + 1) + ': the bar is in proportion to 80 MB');
      eq((await callouts())[0][0], ['bad', 'good', 'bad'][i], 'slot lab, state ' + (i + 1) + ': the callout kind');
      await noRaw('slot lab, state ' + (i + 1));
    }
    ok(/can no longer get changes from replication slot/.test(await notes()), 'slot lab: the last state quotes what a reader of the lost slot got');
    eq(C('repl.slots').forgotten_retained_mb, rows[0][3], 'slot lab: the first state holds the recorded megabytes');
  });

  ok(errs.length === 0, 'the page logged no errors: ' + errs.join(' | '));
  await browser.close(); srv.close();
  console.log(fail ? fail + ' FAILED, ' + pass + ' lab checks passed' : pass + ' lab checks passed');
  process.exit(fail ? 1 : 0);
})();
