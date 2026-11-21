// End-to-end test of the 4 labs of the Scala course, in a real browser.
// It opens scala/index.html, clicks every chip of every lab, and compares what the page shows with
//   (a) what was recorded (scala/js/real.js), and
//   (b) values that are worked out in this file: the colour that follows from an exit code, the Right or Left that the rules of a parser give for a line, and the counts of 1,000 orders
//       worked out from the rule that made them.
// Nothing is read from the widget code. A lab that shows a wrong number, a wrong colour or a stale label fails here, even when the data behind it passes verify/check_widgets.js.
// No step may show an HTML tag, backticks, asterisks, "undefined" or "NaN" as text.
// Needs Playwright:  npm install playwright && npx playwright install chromium
// Run: node scala/verify/e2e_labs.js
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
  await page.addInitScript(() => { try { localStorage.setItem('dep.scala.v1', JSON.stringify({ track: 'all', chosen: true })); } catch (e) { /* ignore */ } });
  await page.goto('http://127.0.0.1:' + srv.address().port + '/scala/index.html'); await page.waitForTimeout(300);

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
  const pills = () => page.$$eval('.lab .lab-note .pill', els => els.map(e => e.innerText.trim().toLowerCase()));      // the style sheet prints them in capitals
  const noRaw = async where => { const t = await page.$eval('.lab', el => el.innerText); ok(!/[`]|\*\*|<\/?[a-z][a-z0-9]*[ >]|undefined|NaN|\[object Object\]/.test(t), where + ' shows no raw markup, undefined or NaN: ' + t.slice(0, 80)); };
  const width = l => +/width:([\d.]+)%/.exec(l[3])[1];
  const section = async (name, fn) => { try { await fn(); } catch (e) { fail++; console.log('FAIL:', name, 'threw', String(e.message).split('\n')[0]); } };
  const colour = exit => (exit ? 'bad' : 'good');

  // lab 1: five builds
  await section('versions lab', async () => {
    await open('verlab');
    const B = C('build.binary'), NL = C('build.no_library'), BJ = C('build.jar'), S = REAL.meta.scala;
    const cases = [
      { name: 'all Scala ' + S, ver: S, exit: 0, out: B.both213_output, kind: 'good', has: ['order of a map'.length ? 'Spark ' + REAL.meta.spark : ''] },
      { name: 'all Scala ' + REAL.meta.scala_212, ver: REAL.meta.scala_212, exit: 0, out: B.both212_output, kind: 'good', has: ['order of a map'] },
      { name: 'a 2.12 library in a 2.13 app', ver: '2.12 and 2.13', exit: 1, out: B.mixed_error, kind: 'bad', has: ['without a word', 'immutable.Seq'] },
      { name: 'no scala-library on the classpath', ver: 'none', exit: 1, out: NL.error, kind: 'bad', has: ['args.isEmpty'] },
      { name: 'java -jar of your own jar', ver: 'not in the jar', exit: 1, out: BJ.jar_run_error, kind: 'bad', has: ['assembly', BJ.with_library_output] }
    ];
    eq(await chipTexts('vl-k'), cases.map(c => c.name), 'versions lab: the chips name the five builds');
    for (let k = 0; k < cases.length; k++) {
      await pick('vl-k', String(k));
      const c = cases[k], b = await bigs(), p = await pres(), co = (await callouts())[0];
      eq(await chipOn('vl-k'), [String(k)], 'versions lab, ' + c.name + ': it is selected');
      eq(b.map(x => x[0]), [c.ver, String(c.exit)], 'versions lab, ' + c.name + ': the version and the exit code');
      eq(b.map(x => x[1]), ['the Scala version of the library', 'exit code'], 'versions lab: the labels');
      eq(b.map(x => x[2]), [c.kind, colour(c.exit)], 'versions lab, ' + c.name + ': the colours follow the exit code');
      eq(p[0][1], c.out, 'versions lab, ' + c.name + ': the output is the recorded one');
      eq(p[0][0], c.exit ? 'err' : '', 'versions lab, ' + c.name + ': a failure is shown as an error');
      eq(co[0], c.kind, 'versions lab, ' + c.name + ': the colour of the callout');
      c.has.filter(Boolean).forEach(w => ok(co[1].includes(w), 'versions lab, ' + c.name + ': the callout says "' + w + '": ' + co[1].slice(0, 120)));
      eq(await pills(), ['recorded'], 'versions lab: the note says that the output is recorded');
      await noRaw('versions lab, ' + c.name);
    }
  });

  // lab 2: a case class and a match
  await section('match lab', async () => {
    await open('matchlab');
    const O = X('lang.orders').split('\n').slice(2), L = C('lang');
    const cases = [
      { name: 'equal, but not the same', kind: 'tip', nums: [['true', 'a == Order(same fields)'], ['false', 'a eq Order(same fields)']], cls: ['', ''], has: ['same object'] },
      { name: 'copy', kind: 'tip', nums: [['Order(O-1,1,Shipped,1250)', 'a.copy(status = Shipped)'], ['Order(O-1,1,Placed,1250)', 'a, unchanged']], cls: ['', ''], has: ['new** order'] },
      { name: 'a case left out: scalac', kind: 'warn', nums: [['a warning', 'from the compiler'], [L.missing_input, 'the input that would fail']], cls: ['', ''], has: ['match may not be exhaustive'] },
      { name: 'the same code, run', kind: 'bad', nums: [['Refunded', 'scala.MatchError'], ['1', 'exit code']], cls: ['bad', ''], has: ['scala.MatchError'] }
    ];
    eq(O.slice(0, 4), ['Order(O-1,1,Placed,1250)', 'true', 'false', 'Order(O-1,1,Shipped,1250)'], 'match lab: the recording holds the values that the cases show');
    eq(await chipTexts('ml-k'), cases.map(c => c.name), 'match lab: the chips name the four steps');
    eq(await chipOn('ml-k'), ['2'], 'match lab: it opens on the warning');
    for (let k = 0; k < cases.length; k++) {
      await pick('ml-k', String(k));
      const c = cases[k], b = await bigs(), co = (await callouts())[0];
      eq(b.map(x => [x[0], x[1]]), c.nums, 'match lab, ' + c.name + ': the numbers and their labels');
      eq(b.map(x => x[2]), c.cls, 'match lab, ' + c.name + ': the colours');
      eq(co[0], c.kind, 'match lab, ' + c.name + ': the colour of the callout');
      c.has.forEach(w => ok(co[1].includes(w.replace('**', '')) || co[1].includes(w), 'match lab, ' + c.name + ': the callout says "' + w + '": ' + co[1].slice(0, 120)));
      await noRaw('match lab, ' + c.name);
    }
    eq(await pills(), ['recorded'], 'match lab: the note says that the output is recorded');
  });

  // lab 3: five lines through a parser
  await section('errors lab', async () => {
    await open('errlab');
    const INPUT = ['O-1,1,12.50', 'O-2,x,3.00', 'O-3,2,4.505', 'O-4,2', 'O-5,2,7'];
    const parseCents = a => { if (!/^-?\d+(\.\d+)?$/.test(a)) return { l: "not a number: '" + a + "'" }; if ((a.split('.')[1] || '').length > 2) return { l: "more than two decimals: '" + a + "'" }; const [w, f = ''] = a.split('.'); return { r: +w * 100 + +(f + '00').slice(0, 2) }; };
    const parse = line => { const f = line.split(','); if (f.length !== 3) return { l: 'expected 3 fields but got ' + f.length + ": '" + line + "'" }; if (!/^-?\d+$/.test(f[1])) return { l: "bad store id: '" + f[1] + "'" }; const c = parseCents(f[2]); return c.l ? { l: c.l } : { r: c.r, text: 'Order(' + f[0] + ',' + f[1] + ',' + c.r + ')' }; };
    eq(await chipTexts('el-k'), INPUT, 'errors lab: the chips are the five lines of the file');
    eq(await chipOn('el-k'), ['1'], 'errors lab: it opens on the second line');
    for (let k = 0; k < INPUT.length; k++) {
      await pick('el-k', String(k));
      const r = parse(INPUT[k]), b = await bigs(), p = await pres(), co = (await callouts())[0];
      eq(b.map(x => [x[0], x[1], x[2]]), [[INPUT[k], 'the line', ''], [r.l ? 'Left' : 'Right', 'what parse returned', r.l ? 'warn' : 'good']], 'errors lab, line ' + (k + 1) + ': the line, and Right or Left with its colour');
      eq(p[0][1], r.l ? 'Left(' + r.l + ')' : 'Right(' + r.text + ')', 'errors lab, line ' + (k + 1) + ': the result is the one that the rules give');
      eq(co[0], r.l ? 'warn' : 'good', 'errors lab, line ' + (k + 1) + ': the colour of the callout');
      ok(r.l ? co[1].includes('names the value') : co[1].includes('`') === false && co[1].includes(String(r.r)), 'errors lab, line ' + (k + 1) + ': the callout says ' + (r.l ? 'that the reason names the value' : 'the cents ' + r.r) + ': ' + co[1].slice(0, 120));
      await noRaw('errors lab, line ' + (k + 1));
    }
    ok((await notes()).includes(C('err').summary), 'errors lab: the note quotes the summary of all five lines: ' + C('err').summary);
  });

  // lab 4: Spark
  await section('spark lab', async () => {
    await open('sparklab');
    const orders = []; for (let i = 1; i <= 1000; i++) orders.push({ cents: 500 + i });
    const fixed = orders.filter(o => o.cents >= 600).length, S = C('spark'), E = C('spark.errors');
    const cases = [
      { name: 'a typo in a typed lambda', kind: 'good', nums: [['compile time', 'when it is found'], ['value statu is not a member of Order', 'scalac says']], cls: ['good', ''], pre: true, has: ['suggests `status`'.replace(/`/g, '')] },
      { name: 'a typo in a column name', kind: 'warn', nums: [['run time', 'when it is found'], ['UNRESOLVED_COLUMN.WITH_SUGGESTION', 'error condition']], cls: ['', ''], pre: true, has: ['planned'] },
      { name: 'a lambda that uses Settings', kind: 'bad', nums: [['Task not serializable', 'what Spark said'], ['NotSerializableException: Settings', 'the cause']], cls: ['bad', ''], pre: true, has: ['not `Serializable`'.replace(/`/g, '')] },
      { name: 'copy the number first', kind: 'good', nums: [[n(fixed), 'orders with 600 cents or more'], ['1,000', 'orders in the Dataset']], cls: ['good', ''], pre: true, has: [n(fixed)] },
      { name: 'a class that is not a case class', kind: 'warn', nums: [['compile time', 'when it is found'], ['value toDS is not a member of Seq[Plain]', 'scalac says']], cls: ['', ''], pre: true, has: ['encoder'] }
    ];
    eq(S.fixed_count, fixed, 'spark lab: the recording counts the orders that the rule gives');
    eq(await chipTexts('sk-k'), cases.map(c => c.name), 'spark lab: the chips name the five cases');
    eq(await chipOn('sk-k'), ['2'], 'spark lab: it opens on the lambda that uses Settings');
    for (let k = 0; k < cases.length; k++) {
      await pick('sk-k', String(k));
      const c = cases[k], b = await bigs(), co = (await callouts())[0], p = await pres();
      eq(b.map(x => [x[0], x[1]]), c.nums, 'spark lab, ' + c.name + ': the numbers and their labels');
      eq(b.map(x => x[2]), c.cls, 'spark lab, ' + c.name + ': the colours');
      eq(co[0], c.kind, 'spark lab, ' + c.name + ': the colour of the callout');
      eq(p[0][0], c.kind === 'bad' || c.kind === 'warn' ? 'err' : '', 'spark lab, ' + c.name + ': a failure is shown as an error');
      c.has.forEach(w => ok(co[1].includes(w) || p[0][1].includes(w), 'spark lab, ' + c.name + ': it says "' + w + '": ' + co[1].slice(0, 120)));
      await noRaw('spark lab, ' + c.name);
    }
    eq(await pills(), ['recorded'], 'spark lab: the note says that the run is recorded');
  });

  ok(errs.length === 0, 'no console or page errors: ' + errs.slice(0, 3).join(' | '));
  await browser.close(); srv.close();
  console.log(fail ? fail + ' lab checks FAILED, ' + pass + ' passed' : pass + ' lab checks passed');
  process.exit(fail ? 1 : 0);
})();
