// End-to-end test of the 5 labs of the Java course, in a real browser.
// It opens java/index.html, clicks every chip of every lab, and compares what the page shows with
//   (a) what was recorded (java/js/real.js), and
//   (b) values that are worked out in this file: the heap that each command asked for, the colour that follows from an exit code, the width of a bar, the error of a sum
//       that should be exact, and how many runs of three were short or exact.
// Nothing is read from the widget code. A lab that shows a wrong number, a wrong colour or a stale label fails here, even when the data behind it passes verify/check_widgets.js.
// No step may show an HTML tag, backticks, asterisks, "undefined" or "NaN" as text.
// Needs Playwright:  npm install playwright && npx playwright install chromium
// Run: node java/verify/e2e_labs.js
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
  await page.addInitScript(() => { try { localStorage.setItem('dep.java.v1', JSON.stringify({ track: 'all', chosen: true })); } catch (e) { /* ignore */ } });
  await page.goto('http://127.0.0.1:' + srv.address().port + '/java/index.html'); await page.waitForTimeout(300);

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
  const pills = () => page.$$eval('.lab .lab-note .pill', els => els.map(e => e.innerText.trim().toLowerCase()));      // the style sheet prints them in capitals
  const noRaw = async where => { const t = await page.$eval('.lab', el => el.innerText); ok(!/[`]|\*\*|<\/?[a-z][a-z0-9]*[ >]|undefined|NaN|\[object Object\]/.test(t), where + ' shows no raw markup, undefined or NaN: ' + t.slice(0, 80)); };
  const width = l => +/width:([\d.]+)%/.exec(l[3])[1];
  const section = async (name, fn) => { try { await fn(); } catch (e) { fail++; console.log('FAIL:', name, 'threw', String(e.message).split('\n')[0]); } };
  const colour = exit => (exit ? 'bad' : 'good');

  // lab 1: a dependency conflict, and a jar that runs alone
  await section('dependency lab', async () => {
    await open('deplab');
    const CF = C('maven.conflict'), FX = C('maven.conflict_fixed'), RN = C('maven.run');
    const cases = [
      { name: 'commons-io pinned to 2.4', ver: '2.4', exit: CF.exit, out: CF.error.replace('Exception in thread "main" ', ''), kind: 'bad', has: [CF.wanted_io_version, 'nearest'] },
      { name: 'commons-io pinned to 2.16.1', ver: '2.16.1', exit: FX.exit, out: FX.output, kind: 'good', has: ['version and not the code'] },
      { name: 'java -jar, the shaded jar', ver: 'inside the jar', exit: RN.shaded_exit, out: RN.shaded_output, kind: 'good', has: [String(RN.cents_expected) + ' cents'] },
      { name: 'java -jar, the thin jar', ver: 'not in the jar', exit: RN.thin_exit, out: RN.thin_error, kind: 'bad', has: ['NoClassDefFoundError'] }
    ];
    eq(await chipTexts('dl-k'), cases.map(c => c.name), 'dependency lab: the chips name the four cases');
    for (let k = 0; k < cases.length; k++) {
      await pick('dl-k', String(k));
      const c = cases[k], b = await bigs(), p = await pres(), co = (await callouts())[0];
      eq(await chipOn('dl-k'), [String(k)], 'dependency lab, ' + c.name + ': it is selected');
      eq(b.map(x => x[0]), [c.ver, String(c.exit)], 'dependency lab, ' + c.name + ': the library and the exit code');
      eq(b.map(x => x[1]), ['the library that was used', 'exit code'], 'dependency lab: the labels');
      eq(b.map(x => x[2]), [c.kind, colour(c.exit)], 'dependency lab, ' + c.name + ': the colours follow the exit code');
      eq(p[0][1], c.out, 'dependency lab, ' + c.name + ': the output is the recorded one');
      eq(p[0][0], c.exit ? 'err' : '', 'dependency lab, ' + c.name + ': a failure is shown as an error');
      eq(co[0], c.kind, 'dependency lab, ' + c.name + ': the colour of the callout');
      c.has.forEach(w => ok(co[1].includes(w), 'dependency lab, ' + c.name + ': the callout says "' + w + '": ' + co[1].slice(0, 100)));
      eq(await pills(), ['recorded'], 'dependency lab: the note says that the output is recorded');
      await noRaw('dependency lab, ' + c.name);
    }
  });

  // lab 2: a file of a million lines against a small heap
  await section('heap lab', async () => {
    await open('heaplab');
    const M = C('mem');
    const mt = X('mem.stream').split('\n'), cmdHeap = l => { const m = /-Xmx(\d+)([mg])/.exec(l); return +m[1] * (m[2] === 'g' ? 1024 : 1); };
    const heaps = [cmdHeap(X('mem.oom').split('\n')[0]), ...mt.filter(l => /^java /.test(l)).map(cmdHeap)];      // the heap of each command line, in the order of the four cases
    eq(heaps, [64, 64, 32, 2048], 'heap lab: the four commands asked for 64, 64, 32 and 2048 MB');
    const cases = [
      { name: 'readAllLines, heap 64 MB', exit: M.oom_exit, out: M.oom_message, kind: 'bad' },
      { name: 'Files.lines, count, heap 64 MB', exit: M.stream_exit, out: M.stream_output, kind: 'good' },
      { name: 'BufferedReader and a sum, heap 32 MB', exit: M.sum_exit, out: M.sum_output, kind: 'good' },
      { name: 'readAllLines, heap 2 GB', exit: 0, out: M.all_2g_output, kind: 'warn' }
    ];
    eq(await chipTexts('hl-k'), cases.map(c => c.name), 'heap lab: the chips name the four ways');
    for (let k = 0; k < cases.length; k++) {
      await pick('hl-k', String(k));
      const c = cases[k], heap = heaps[k], b = await bigs(), L = await lanes(), p = await pres(), co = (await callouts())[0];
      eq(b.map(x => x[0]), [n(M.file_mb) + ' MB', n(heap) + ' MB', String(c.exit)], 'heap lab, ' + c.name + ': the file, the heap and the exit code');
      eq(b.map(x => x[1]), ['the file on disk', 'the heap limit (-Xmx)', 'exit code'], 'heap lab: the labels');
      eq(b.map(x => x[2]), ['', '', colour(c.exit)], 'heap lab, ' + c.name + ': only the exit code is coloured');
      eq([L[0][0], L[0][1], L[0][2]], ['heap against file', n(heap) + ' MB', colour(c.exit)], 'heap lab, ' + c.name + ': the bar and its colour');
      ok(Math.abs(width(L[0]) - Math.max(1, Math.min(100, heap / 2048 * 100))) < 0.01, 'heap lab, ' + c.name + ': the bar is in proportion to 2,048 MB: ' + width(L[0]));
      eq(p[0][1], c.out, 'heap lab, ' + c.name + ': the output is the recorded one');
      eq(co[0], c.kind, 'heap lab, ' + c.name + ': the colour of the callout');
      if (k === 2) ok(co[1].includes(M.sum_expected.replace('1000000 rows, ', '').replace(' cents', '')) || co[1].includes(n(+/(\d+) cents/.exec(M.sum_expected)[1])), 'heap lab: the sum callout names the total that Python worked out: ' + co[1].slice(0, 200));
      await noRaw('heap lab, ' + c.name);
    }
    eq(await pills(), ['recorded'], 'heap lab: the note says that the runs are recorded');
  });

  // lab 3: money
  await section('money lab', async () => {
    await open('moneylab');
    const NS = C('num.sums'), L = X('num.numbers').split('\n').slice(1);
    const err = (parseFloat(NS.double_sum) - 100000).toExponential(2);
    const cases = [
      { name: 'double', kind: 'bad', nums: [[NS.first, '0.1 + 0.2'], [NS.double_sum, 'ten cents, a million times'], [err, 'off from 100000']], cls: ['bad', '', ''], has: [NS.double_sum] },
      { name: 'BigDecimal', kind: 'good', nums: [[NS.bigdecimal_sum, 'ten cents, a million times'], [L[3].slice(0, 18) + '...', 'new BigDecimal(0.1)'], [L[6], 'equals, then compareTo']], cls: ['good', '', ''], has: [NS.bigdecimal_sum] },
      { name: 'int and long', kind: 'warn', nums: [[L[4], 'Integer.MAX_VALUE + 1'], ['integer overflow', 'Math.addExact'], [L[10], '19.99 as cents, times 3']], cls: ['', '', ''], has: ['wraps'] },
      { name: 'rounding', kind: 'tip', nums: [[L[8], '10 / 3, two decimals'], [L[9], '2.345 and 2.355 with HALF_EVEN'], [L[7].replace('divide: ', '').slice(0, 24) + '...', 'divide with no scale']], cls: ['', '', ''], has: ['rounding mode'] }
    ];
    eq(await chipTexts('ml-k'), cases.map(c => c.name), 'money lab: the chips name the four types');
    for (let k = 0; k < cases.length; k++) {
      await pick('ml-k', String(k));
      const c = cases[k], b = await bigs(), co = (await callouts())[0];
      eq(b.map(x => [x[0], x[1]]), c.nums, 'money lab, ' + c.name + ': the three numbers and their labels');
      eq(b.map(x => x[2]), c.cls, 'money lab, ' + c.name + ': the colours');
      eq(co[0], c.kind, 'money lab, ' + c.name + ': the colour of the callout');
      c.has.forEach(w => ok(co[1].includes(w), 'money lab, ' + c.name + ': the callout says "' + w + '": ' + co[1].slice(0, 100)));
      await noRaw('money lab, ' + c.name);
    }
    eq(await pills(), ['recorded'], 'money lab: the note says that the numbers are recorded');
  });

  // lab 4: JDBC
  await section('JDBC lab', async () => {
    await open('sqllab');
    const J = X('jdbc.run').split('\n');
    const num = (line, re) => re.exec(line).slice(1);
    const [bt, br0] = num(J[1], /rows after (\d+) batches: (\d+)/), [g0, bd0] = num(J[2], /glued into the text: (\d+) rows, bound as a parameter: (\d+) rows/), [ins0] = num(J[3], /inside the transaction: (\d+)/), [aft0] = num(J[4], /after the rollback: (\d+)/), [st] = num(J[5], /SQLState (\d+)/);
    const [br, g, bd, ins, aft] = [br0, g0, bd0, ins0, aft0].map(n);
    const cases = [
      { name: 'a batch', kind: 'good', nums: [[bt, 'batches sent'], [br, 'rows in the table']], cls: ['', ''], has: ['PreparedStatement'] },
      { name: 'a value glued into the text', kind: 'bad', nums: [[g, 'rows found'], [bd, 'rows found with a parameter']], cls: ['bad', 'good'], has: ['injection', "x' OR '1'='1"] },
      { name: 'a transaction', kind: 'tip', nums: [[ins, 'rows inside the transaction'], [aft, 'rows after the rollback']], cls: ['', 'good'], has: ['setAutoCommit(false)'] },
      { name: 'a duplicate key', kind: 'warn', nums: [[st, 'SQLState of the error']], cls: [''], has: [st] }
    ];
    eq(await chipTexts('sq-k'), cases.map(c => c.name), 'JDBC lab: the chips name the four steps');
    for (let k = 0; k < cases.length; k++) {
      await pick('sq-k', String(k));
      const c = cases[k], b = await bigs(), co = (await callouts())[0];
      eq(await chipOn('sq-k'), [String(k)], 'JDBC lab, ' + c.name + ': it is selected');
      eq(b.map(x => [x[0], x[1]]), c.nums, 'JDBC lab, ' + c.name + ': the numbers and their labels');
      eq(b.map(x => x[2]), c.cls, 'JDBC lab, ' + c.name + ': the colours');
      eq(co[0], c.kind, 'JDBC lab, ' + c.name + ': the colour of the callout');
      c.has.forEach(w => ok(co[1].includes(w), 'JDBC lab, ' + c.name + ': the callout says "' + w + '": ' + co[1].slice(0, 120)));
      await noRaw('JDBC lab, ' + c.name);
    }
    eq(await pills(), ['recorded'], 'JDBC lab: the note says that the output is recorded');
  });

  // lab 5: threads
  await section('race lab', async () => {
    await open('racelab');
    const K = C('conc'), short3 = K.plain_short_in_runs.filter(Boolean).length, exact3 = K.atomic_exact_in_runs.filter(Boolean).length;
    const cases = [
      { name: 'a plain int', kind: 'bad', nums: [[short3 + ' of ' + K.runs, 'runs that ended short'], ['800,000', 'the answer it should give']], cls: ['bad', ''], has: ['read, add, write'] },
      { name: 'AtomicInteger', kind: 'good', nums: [[exact3 + ' of ' + K.runs, 'runs that were exact'], ['800,000', 'the total every time']], cls: ['good', ''], has: ['incrementAndGet'] },
      { name: 'a pool of 4 threads', kind: 'tip', nums: [[String(K.pool_sum), 'sum of the squares of 1 to 10']], cls: [''], has: ['Future'] },
      { name: 'virtual threads', kind: 'tip', nums: [[n(K.virtual_finished), 'tasks that finished'], [K.is_virtual ? 'yes' : 'no', 'Thread.isVirtual()']], cls: ['', ''], has: ['virtual thread'] }
    ];
    eq(await chipTexts('rl-k'), cases.map(c => c.name), 'race lab: the chips name the four ways');
    for (let k = 0; k < cases.length; k++) {
      await pick('rl-k', String(k));
      const c = cases[k], b = await bigs(), co = (await callouts())[0];
      eq(b.map(x => [x[0], x[1]]), c.nums, 'race lab, ' + c.name + ': the numbers and their labels');
      eq(b.map(x => x[2]), c.cls, 'race lab, ' + c.name + ': the colours');
      eq(co[0], c.kind, 'race lab, ' + c.name + ': the colour of the callout');
      c.has.forEach(w => ok(co[1].includes(w), 'race lab, ' + c.name + ': the callout says "' + w + '": ' + co[1].slice(0, 120)));
      await noRaw('race lab, ' + c.name);
    }
    eq(await pills(), ['recorded'], 'race lab: the note says that the runs are recorded');
  });

  ok(errs.length === 0, 'no console or page errors: ' + errs.slice(0, 3).join(' | '));
  await browser.close(); srv.close();
  console.log(fail ? fail + ' lab checks FAILED, ' + pass + ' passed' : pass + ' lab checks passed');
  process.exit(fail ? 1 : 0);
})();
