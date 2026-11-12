// Browser test of every lab of the Python tutorial, against values worked out by hand (not copied from the recording).
// Same harness style as the blocks of dev/e2e.js, standalone. Needs Playwright:  npm install playwright && npx playwright install chromium
// Run: node python/verify/e2e_labs.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
const name = 'python';
const storageKey = (fs.readFileSync(path.join(root, name, 'js', 'config.js'), 'utf8').match(/storageKey:\s*'([^']+)'/) || [])[1];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
// Sizes and counts are the same in every recording, so the checks below work them out by hand. Timings change with every recording,
// so the formats lab check reads them from js/real.js and applies the lab's rounding rule (100 ms and more: whole, 10 ms and more: one decimal, else two).
const REC = (() => { const w = { LAB: {} }; new Function('window', 'LAB', fs.readFileSync(path.join(root, name, 'js', 'real.js'), 'utf8'))(w, w.LAB); return w.LAB.real; })();
const fmtMs = x => (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2)) + ' ms';

(async () => {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end(); }
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
  await page.addInitScript(([k]) => { if (!sessionStorage.getItem('e2e-init')) { try { localStorage.setItem(k, JSON.stringify({ track: 'all', chosen: true })); } catch (e) {} sessionStorage.setItem('e2e-init', '1'); } }, [storageKey]);
  await page.goto(url); await page.waitForTimeout(400);

  const go = async key => { await page.evaluate(k => { location.hash = k; }, key); await page.waitForTimeout(60); };
  const click = async (act, v) => {
    const hit = await page.evaluate(([a, val]) => { const b = [...document.querySelectorAll('#stage-body [data-act="' + a + '"]')].find(x => val === null || x.getAttribute('data-v') === val); if (!b) return false; b.click(); return true; }, [act, v === undefined ? null : String(v)]);
    ok(hit, 'a button for ' + act + (v === undefined ? '' : ' = ' + v) + ' exists'); await page.waitForTimeout(40);
  };
  const stage = () => page.evaluate(() => document.querySelector('#stage-body').innerText.replace(/\s+/g, ' '));
  const bigs = () => page.evaluate(() => [...document.querySelectorAll('#stage-body .lab-out .big')].map(e => [e.querySelector('b').innerText.trim(), e.querySelector('span').innerText.trim()]));
  const rows = () => page.evaluate(() => [...document.querySelectorAll('#stage-body .tbl tbody tr')].map(tr => [...tr.cells].map(c => c.innerText.replace(/\s+/g, ' ').trim())));
  const count = sel => page.evaluate(s => document.querySelectorAll('#stage-body ' + s).length, sel);
  const texts = sel => page.evaluate(s => [...document.querySelectorAll('#stage-body ' + s)].map(e => e.innerText.trim()), sel);
  const on = sel => page.evaluate(s => [...document.querySelectorAll('#stage-body ' + s + '.on')].map(e => e.innerText.trim()), sel);
  const lab = async (label, fn) => { const before = errs.length; try { await fn(); } catch (e) { ok(false, label + ' threw ' + e.message); } ok(errs.length === before, label + ' raised no page error: ' + errs.slice(before).join(' | ')); };

  // ---------- m2: version specifiers (PEP 440, worked by hand) ----------
  await lab('spec', async () => {
    await go('m2-lab-spec:0');
    const s0 = await stage(); ok(/pandas/.test(s0) && /3\.1\.1/.test(s0), 'spec lab shows pandas and its versions');
    await click('sp-p', 'requests'); ok(/requests/.test(await stage()), 'the package chip switches to requests');
    await click('sp-p', 'pandas');
    const specs = await texts('[data-act="sp-s"]'); ok(specs.length === 9, 'nine specifiers to pick from, saw ' + specs.length);
    const i = specs.findIndex(t => t.replace(/\s/g, '') === '~=3.0.2'); ok(i >= 0, 'the specifier ~=3.0.2 is offered');
    await click('sp-s', i); let t = await stage();
    ok(/1 of 8 releases allowed/.test(t) && /3\.0\.6 the version uv or pip would pick/.test(t), '~=3.0.2 allows only 3.0.6 (3.0.0 is older than 3.0.2, and 3.1.x leaves 3.0.*)');
    await click('sp-s', specs.findIndex(x => x.replace(/\s/g, '') === '>=3')); ok(/4 of 8 releases allowed/.test(await stage()), '>=3 allows 3.0.0, 3.0.6, 3.1.0 and 3.1.1');
    await click('sp-s', specs.findIndex(x => x.replace(/\s/g, '') === '>=2.2,<3')); ok(/2 of 8 releases allowed/.test(await stage()), '>=2.2,<3 allows 2.2.3 and 2.3.3');
    await click('sp-s', specs.findIndex(x => x.replace(/\s/g, '') === '<3.1')); ok(/6 of 8 releases allowed/.test(await stage()), '<3.1 allows six of the eight');
  });

  // ---------- m3: lookups and sizes ----------
  await lab('lookup', async () => {
    await go('m3-lab-lookup:0');
    const r = await rows(); ok(r.length >= 3, 'the lookup lab has a row for each size');
    r.forEach(x => ok(x[0] === x[1] && x[2] === '1' && x[3] === '1', 'a list needs one comparison for each item, a set needs one: ' + x.join(' / ')));
    ok(/list O\(n\), set O\(1\)/.test(await stage()), 'the lab ends with the big-O words');
  });
  await lab('structs', async () => {
    await go('m3-lab-structs:0'); const t = await stage();
    ok(/a list of dicts 501\.6 1\.54x/.test(t), 'a list of dicts costs 501.6 bytes for each record (100,323,037 over 200,000), which is 1.54 times a tuple (501.6 / 325.6)');
    ok(/a pandas DataFrame, with category and small integers 26\.3/.test(t), 'the small pandas table costs 26.3 bytes for each record');
    await click('sm-n', 1000000); const e = await stage(); ok(/a list of dicts 502 MB/.test(e) && /a list of tuples 326 MB/.test(e), 'at a million records the estimate is 501.6 and 325.6 bytes times a million');
  });

  // ---------- m4: pull and memory ----------
  await lab('pull', async () => {
    await go('m4-lab-pull:0');
    await click('pl-m', 'lists');
    for (let k = 0; k < 4; k++) await click('pl-step');   // the four reads
    let t = await stage(); ok(/4 orders in flight now/.test(t), 'with lists, after four reads all four orders are in flight (hand count: 4)');
    for (let k = 0; k < 10; k++) await click('pl-step');
    t = await stage(); ok(/4 most in flight at once so far/.test(t) && /14 OF 14 LINES/i.test(t), 'with lists the peak is 4 orders, and the trace has 14 lines');
    await click('pl-m', 'gens'); await click('pl-step'); await click('pl-step');
    t = await stage(); ok(/1 orders in flight now/.test(t), 'with generators, after one read and one parse a single order is in flight');
    for (let k = 0; k < 12; k++) await click('pl-step');
    t = await stage(); ok(/0 orders in flight now/.test(t) && /1 most in flight at once so far/.test(t), 'with generators the peak is one order, and all are finished at the end');
    await click('pl-reset'); ok(/nothing has run yet/i.test(await stage()), 'reset empties the trace');
  });
  await lab('genmem', async () => {
    await go('m4-lab-mem:0');
    const chips = await texts('[data-act="gm-i"]'); ok(chips.length === 8, 'five recorded sizes and three estimates, saw ' + chips.length);
    let t = await stage(); ok(/list of all rows 115\.3 MB/.test(t) && /generator, batches of 10,000 11\.7 MB/.test(t), 'at 200,000 rows the list peaks at 115.3 MB (115,277,472 bytes) and the generator at 11.7 MB');
    await click('gm-i', 4); t = await stage(); ok(/list of all rows 460\.8 MB/.test(t) && /800,000 rows/.test(t), 'at 800,000 rows the list peaks at 460.8 MB, 4 times more than at 200,000, and the generator stays at 11.7 MB');
    await click('gm-i', 7); ok(/50\.00 GB file \(estimate\)/.test(await stage()), 'the estimates say that they are estimates');
  });

  // ---------- m5: encodings and formats ----------
  await lab('encoding', async () => {
    await go('m5-lab-enc:0');
    await click('en-t', 'café'); await click('en-f', 'utf-8'); await click('en-r', 'latin-1');
    const t = await stage(); ok(/63 61 66 c3 a9/.test(t), 'café in UTF-8 is the bytes 63 61 66 c3 a9 (hand: c3 a9 is the two byte form of é)'); ok(t.includes('cafÃ©'), 'read as Latin-1 it gives cafÃ©');
    await click('en-r', 'utf-8'); ok((await stage()).includes('café'), 'read as UTF-8 it gives café back');
    await click('en-t', '東京'); await click('en-f', 'latin-1'); ok(/cannot encode/i.test(await stage()), '東京 cannot be written as Latin-1');
    await click('en-f', 'utf-16'); await click('en-t', 'Zoe'); ok(/ff fe 5a 00 6f 00 65 00/.test(await stage()), 'Zoe in UTF-16 starts with the byte order mark ff fe, then two bytes for each letter');
  });
  await lab('formats', async () => {
    await go('m5-lab-formats:0');
    let t = await stage(); const r = await rows(); ok(r.length === 7, 'seven formats in the table, saw ' + r.length);
    ok(/CSV 11,699,307 100 %/.test(t) && /CSV, gzip 3,087,406 26 %/.test(t) && /CSV, zstd 3,363,892 29 %/.test(t) && /JSON Lines 30,703,423 262 %/.test(t), 'shares of the CSV size by hand: gzip 3,087,406 / 11,699,307 = 26 %, zstd 29 %, JSON Lines 262 %');
    ok(/Parquet, snappy 4,153,000 35 %/.test(t) && /Parquet, zstd 2,900,742 25 %/.test(t), 'Parquet: 4,153,000 / 11,699,307 = 35 %, with zstd 25 %');
    await click('fm-m', 'time'); t = await stage();
    const fq = REC.counts['m5.formats'].formats.map(f => f.query_ms), ratio = Math.round(Math.max(...fq) / Math.min(...fq));
    ok(REC.counts['m5.formats'].formats.length === 7 && REC.counts['m5.formats'].formats.every(f => t.includes(fmtMs(f.query_ms))), 'the time view shows the recorded query time of all seven formats: ' + REC.counts['m5.formats'].formats.map(f => fmtMs(f.query_ms)).join(', '));
    ok(t.includes('about ' + ratio + ' times as long'), 'the time view says the slowest query took about ' + ratio + ' times as long as the fastest (' + Math.max(...fq) + ' / ' + Math.min(...fq) + ')');
  });

  // ---------- m6: time zones and money ----------
  await lab('dst', async () => {
    await go('m6-lab-dst:0');
    let t = await stage(), r = await rows(), b = await texts('.lab-out .big b');
    ok(/does not exist/.test(b.join()), 'London 2026-03-29 01:30 does not exist (the clocks jump from 01:00 to 02:00)');
    ok(r[0][1] === '+00:00' && r[0][2] === '2026-03-29 01:30' && r[1][1] === '+01:00' && r[1][2] === '2026-03-29 00:30', 'fold 0 reads it as winter time (01:30 UTC), fold 1 as summer time (00:30 UTC)');
    await click('dz-i', 2); b = await texts('.lab-out .big b'); r = await rows();
    ok(/ambiguous/.test(b.join()) && r[0][2] === '2026-10-25 00:30' && r[1][2] === '2026-10-25 01:30', 'London 2026-10-25 01:30 happens twice: 00:30 UTC and 01:30 UTC');
    await click('dz-z', 'America/New_York'); await click('dz-i', 2); r = await rows();
    ok(r[0][1] === '-04:00' && r[0][2] === '2026-11-01 05:30' && r[1][1] === '-05:00' && r[1][2] === '2026-11-01 06:30', 'New York 2026-11-01 01:30 is 05:30 UTC (-04:00) and 06:30 UTC (-05:00)');
    await click('dz-z', 'Asia/Singapore'); await click('dz-i', 0); r = await rows(); b = await texts('.lab-out .big b');
    ok(/exists once/.test(b.join()) && r[0][2] === '2026-06-15 04:00' && r[1][2] === '2026-06-15 04:00', 'Singapore noon is 04:00 UTC in both folds (UTC+8, no clock change)');
  });
  await lab('money', async () => {
    await go('m6-lab-money:0');
    await click('mn-n', 10); let r = await rows(); ok(r[0][1] === '0.9999999999999999' && r[1][1] === '1.0' && r[2][1] === '1.00' && r[3][1] === '100 cents', 'ten additions of 0.10: the float gives 0.9999999999999999, the exact ways give 1');
    await click('mn-n', 1000000); r = await rows(); ok(r[0][1] === '100000.00000133288' && r[3][1] === '10000000 cents', 'a million additions: the float loop gives 100000.00000133288, whole cents give 10,000,000 cents');
    await go('m6-lab-money:1');
    await click('mn-v', '2.675'); r = await rows(); ok(r[0][1] === '2.67' && r[2][1] === '2.68' && r[3][1] === '2.67', '2.675 rounds to 2.67 as a float, 2.68 half up, 2.67 down');
    await click('mn-v', '2.5'); r = await rows(); ok(r[0][1] === '2.0' && r[1][1] === '2' && r[2][1] === '3', '2.5: Python round gives 2.0 (to even), half even 2, half up 3');
    await click('mn-v', '-2.5'); r = await rows(); ok(r[2][1] === '-3' && r[3][1] === '-2', '-2.5: half up gives -3 (away from zero) and down gives -2');
  });

  // ---------- m7: retries and loading a day twice ----------
  await lab('retry', async () => {
    await go('m7-lab-retry:0');
    await click('rt-p', 'exponential'); await click('rt-k', 3); let b = await texts('.lab-out .big b'); ok(b[0] === '3.50 s', 'exponential waits 0.5 + 1 + 2 = 3.5 s for three failures, saw ' + b[0]);
    await click('rt-p', 'fixed 1 s'); await click('rt-k', 4); b = await texts('.lab-out .big b'); ok(b[0] === '4.00 s' && b[1] === '5', 'fixed 1 s four times is 4 s over 5 calls');
    await click('rt-p', 'at once'); b = await texts('.lab-out .big b'); ok(/^0/.test(b[0]), 'retrying at once waits nothing');
    await click('rt-p', 'exponential with full jitter'); await click('rt-k', 4); let r = await rows(); ok(r.length === 5, 'four failures and a success make five rows'); const waits = r.slice(0, 4).map(x => parseFloat(x[2]) * (/ms/.test(x[2]) ? 0.001 : 1)); ok(waits.every((w, i) => w <= 0.5 * 2 ** i + 1e-9), 'every jittered wait stays under its limit 0.5, 1, 2, 4');
    await go('m7-lab-retry:1');
    b = await bigs(); ok(b[0][0] === '330' && b[1][0] === '10 of 50' && b[2][0] === '40' && b[4][0] === '280', 'fifty clients retrying at once: 50 + 40 x 7 = 330 requests, 10 served, 40 give up');
    await click('rt-sp', 'fixed 1 s'); b = await bigs(); ok(b[0][0] === '150' && b[1][0] === '50 of 50' && b[3][0] === '4 s' && b[4][0] === '40', 'a fixed second: 50 + 40 + 30 + 20 + 10 = 150 requests, finished in 4 s, bursts of 40');
    await click('rt-sp', 'exponential'); b = await bigs(); ok(b[1][0] === '50 of 50' && b[3][0] === '15.5 s', 'exponential: everyone served, the last at 15.5 s (0.5 + 1 + 2 + 4 + 8)');
    ok((await count('.rchart .rb')) > 100, 'the chart has a bar for each 100 ms');
  });
  await lab('idem', async () => {
    await go('m7-lab-idem:0');
    let r = await rows(), b = await texts('.lab-out .big b');
    ok(b[0] === 'right' && r[0][1].startsWith('crashed') && r[0][2] === '0' && r[1][1] === 'finished' && r[1][2] === '6' && r[1][3] === '82.75', 'a transaction that crashes leaves 0 rows, and the rerun gives 6 rows and 82.75');
    await click('id-s', 'delete, then insert'); r = await rows(); ok(r[0][2] === '3' && r[0][3] === '25.45' && r[1][2] === '6', 'without a transaction, the crash leaves 3 rows (12.50 + 4.75 + 8.20 = 25.45)');
    await click('id-s', 'append'); await click('id-c', 'run twice'); r = await rows(); b = await texts('.lab-out .big b');
    ok(b[0] === 'wrong' && r[1][2] === '12' && r[1][3] === '165.50', 'an append run twice: 12 rows and 165.50 (twice 82.75)');
    ok((await count('.tbl td.wbad')) > 6, 'the repeated orders are marked');
    await click('id-s', 'insert with a key'); await click('id-c', 'crash, then run again'); r = await rows(); ok(/^failed: UNIQUE constraint failed/.test(r[1][1]) && r[1][2] === '3', 'a primary key stops the rerun, so only 3 rows are there');
    await click('id-s', 'upsert'); await click('id-c', 'the source drops O-6'); b = await texts('.lab-out .big b'); ok(b[0] === 'wrong', 'an upsert keeps the dropped order O-6');
    await go('m7-lab-idem:1'); r = await rows();
    ok(r[0].join('|') === 'append|right (6)|wrong (12)|wrong (9)|wrong (12)|wrong (11)', 'the grid row of append: ' + r[0].join('|'));
    ok(r[3].slice(1).every(c => /^right/.test(c)) && r[2].slice(1).every(c => /^right/.test(c)) && /^wrong/.test(r[4][5]), 'both delete strategies are right in every column, and upsert is wrong when a row is dropped');
  });

  // ---------- m8: paging ----------
  await lab('paging', async () => {
    await go('m8-lab-paging:0');
    let b = await bigs(); ok(b[0][0] === '26' && b[1][0] === '3' && b[2][0] === '0', 'offset pages, 3 orders arrive: 26 rows read, 3 twice, 0 missed (23 + 3 repeats)');
    ok((await texts('.idc.dupe')).join() === 'O-120,O-119,O-118', 'page 2 starts with O-120, O-119, O-118, which were the last three of page 1 (3 new orders pushed them down)');
    await click('pg-c', 'delete'); b = await bigs(); ok(b[0][0] === '20' && b[1][0] === '0' && b[2][0] === '3', 'offset pages, 3 cancelled: 20 rows, 3 missed');
    ok((await texts('.idc.miss')).join() === 'O-115,O-116,O-117', 'the missed orders are O-115, O-116, O-117 (page 2 starts 3 places late)');
    await click('pg-s', 'cursor'); b = await bigs(); ok(b[0][0] === '20' && b[1][0] === '0' && b[2][0] === '0', 'cursor pages, 3 cancelled: nothing repeated, nothing missed');
    await click('pg-c', 'insert'); b = await bigs(); ok(b[0][0] === '26' && b[1][0] === '0' && (await texts('.idc.new')).join() === 'O-123,O-124,O-125', 'cursor pages, 3 arrive: 26 rows, the new ones at the end');
  });

  // ---------- m9: a join that multiplies rows ----------
  await lab('fanout', async () => {
    await go('m9-lab-fan:0');
    let b = await bigs(); ok(b[0][0] === '7 to 9' && b[1][0] === '88.35 to 114.65', 'a left join with 2 rows for customer 3: 7 orders become 9 rows (O-4 and O-6 twice), 88.35 becomes 88.35 + 19.90 + 6.40 = 114.65');
    ok((await count('.idc.dupe')) === 2, 'two extra copies');
    await click('fo-d', 2); b = await bigs(); ok(b[0][0] === '7 to 11' && b[1][0] === '88.35 to 140.95', 'three rows for customer 3: 11 rows, 88.35 + 2 x 26.30 = 140.95');
    await click('fo-d', 0); await click('fo-h', 'inner'); b = await bigs(); ok(b[0][0] === '7 to 6' && b[1][0] === '88.35 to 82.75', 'an inner join drops O-7 (customer 4 has no row): 6 rows and 88.35 - 5.60 = 82.75');
    ok((await count('.idc.miss')) === 1, 'O-7 is shown as dropped');
  });

  // ---------- m10: threads, processes and the GIL ----------
  await lab('conc', async () => {
    await go('m10-lab-conc:0');
    ok((await on('.sel-chip')).join('|').includes('compute'), 'the lab starts with computing work');
    let r = await texts('.lane-v'); ok(r.length === 3 && /(no gain|slower)/.test(r[1]) && /times faster/.test(r[2]), 'regular build, computing: threads give no gain or are slower, processes are faster: ' + r.join(' / '));
    await click('cc-b', 'free-threaded'); r = await texts('.lane-v'); ok(/times faster/.test(r[1]) && /GIL enabled: False/.test(await stage()), 'free-threaded build: threads are faster, and the GIL is off');
    await click('cc-w', 'waiting'); r = await texts('.lane-v'); ok(r.length === 4 && /times faster/.test(r[1]) && /times faster/.test(r[3]), 'waiting work: threads and asyncio are faster than one after another');
    const first = r[0]; ok(/^2\.0\d s$/.test(first) || /^2\.\d\d s$/.test(first) || /^1\.9\d s$/.test(first), 'eight waits of 0.25 s take about 2 s one after another: ' + first);
  });

  // ---------- m11: validate or quarantine ----------
  await lab('validate', async () => {
    await go('m11-lab-validate:0');
    let b = await bigs(); ok(b[0][0] === '0' && b[1][0] === '4' && b[2][0] === '0' && (await stage()).includes('failed: 40% of the rows are bad (limit 20%)'), '4 of 10 rows are bad, which is 40 percent: over a 20 percent limit nothing is loaded');
    ok((await count('.tbl td.wgood')) === 6 && (await count('.tbl td.wbad')) === 4, 'six valid rows and four bad rows');
    await click('vd-p', 'quarantine, fail above 50 percent'); b = await bigs(); ok(b[0][0] === '6' && b[1][0] === '4', 'under a 50 percent limit six rows load and four are kept');
    await click('vd-p', 'drop bad rows silently'); b = await bigs(); ok(b[0][0] === '6' && b[2][0] === '4', 'dropping silently loads six and drops four');
    await click('vd-m', 'strict'); b = await bigs(); ok(b[0][0] === '0' && b[2][0] === '10', 'strict mode refuses every text value of a CSV: all ten rows dropped');
    await click('vd-m', 'forbid extra columns'); await click('vd-p', 'quarantine, fail above 50 percent'); b = await bigs(); ok(b[0][0] === '5' && b[1][0] === '5', 'forbidding the coupon column makes a fifth row bad: 5 loaded, 5 in quarantine');
  });

  // ---------- m12: mutants ----------
  await lab('mutants', async () => {
    await go('m12-lab-mut:0');
    let b = await bigs(); ok(b[0][0] === '100 percent' && b[1][0] === '4 of 7', 'weak tests: 100 percent coverage, 4 of 7 changes caught');
    let r = await rows(); ok(r.length === 7 && r.filter(x => /^survived/.test(x[1])).length === 3, 'three of seven changes survive');
    ok(/is_large: >= becomes >.*survived/.test(r.map(x => x.join(' ')).join(' ')), 'the boundary of is_large survives');
    await click('mt-s', 'strong'); b = await bigs(); r = await rows(); ok(b[1][0] === '7 of 7' && r.every(x => x[1] === 'caught'), 'strong tests: all seven changes caught');
    ok(/\(10_000, True\)/.test(await stage()) && /\(100_000, 10, 5_000\)/.test(await stage()), 'the test cases that catch the boundaries are named');
  });

  // ---------- m13: settings in layers ----------
  await lab('config', async () => {
    await go('m13-lab-config:0');
    let r = await rows(); ok(r[1][5] === '200 (env)' && r[0][5].includes('(file)') && r[2][5] === 'False (default)', 'file and environment on: batch_size 200 from the environment, the url from the file, dry_run from the default');
    await click('cf-t', 2); r = await rows(); ok(r[1][5] === '50 (flag)' && r[2][5] === 'True (flag)', 'with the flag on, batch_size is 50 and dry_run is True');
    await click('cf-t', 1); await click('cf-t', 2); r = await rows(); ok(r[1][5] === '500 (file)', 'env and flag off: 500 from the file');
    await click('cf-t', 0); r = await rows(); ok(r[1][5] === '1000 (default)' && r[0][5].includes('(default)'), 'every layer off: the defaults (1000)');
    await click('cf-t', 1); r = await rows(); ok(r[1][5] === '200 (env)', 'only the environment: 200');
  });

  ok(errs.length === 0, 'no page errors in the whole run: ' + errs.join(' | '));
  console.log((fail ? 'FAILED: ' + fail + ' of ' : 'all ') + (pass + fail) + ' lab checks' + (fail ? '' : ' passed') + ' in 17 labs');
  await browser.close(); srv.close();
  process.exit(fail ? 1 : 0);
})();
