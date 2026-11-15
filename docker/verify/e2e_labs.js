// End-to-end test of the 7 labs of the Docker course, in a real browser.
// It opens docker/index.html, clicks every chip of every lab, and compares what the page shows with
//   (a) what was recorded (docker/js/real.js), and
//   (b) values that are worked out in this file (the rule of the build cache, byte ratios, what survives in which storage, which process gets a signal).
// Nothing is read from the widget code. A lab that shows a wrong number or a stale label fails here, even when the data behind it passes
// verify/check_widgets.js. No step may show an HTML tag, backticks, asterisks, "undefined" or "NaN" as text.
// Needs Playwright:  npm install playwright && npx playwright install chromium
// Run: node docker/verify/e2e_labs.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + '\n   got  ' + JSON.stringify(a) + '\n   want ' + JSON.stringify(b));
const fmt = v => Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 });
const mb = x => (x / 1e6).toLocaleString('en-US', { maximumFractionDigits: x < 1e8 ? 1 : 0 }) + ' MB';

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
  await page.addInitScript(() => { try { localStorage.setItem('dep.docker.v1', JSON.stringify({ track: 'all', chosen: true })); } catch (e) { /* ignore */ } });
  await page.goto('http://127.0.0.1:' + srv.address().port + '/docker/index.html'); await page.waitForTimeout(300);

  const REAL = await page.evaluate(() => LAB.real), C = k => REAL.counts[k], T = k => REAL.tables[k], X = k => REAL.text[k];
  const sceneOf = kind => page.evaluate(k => { let f = null; LAB.chapters.forEach(c => c.scenes.forEach(s => { if (s.type === 'widget' && s.kind === k) f = s.id; })); return f; }, kind);
  const open = async kind => { const id = await sceneOf(kind); ok(!!id, 'the course has a lab of kind ' + kind); await page.evaluate(k => { location.hash = k + ':0'; }, id); await page.waitForTimeout(60); };
  const pick = async (act, v) => { await page.click('[data-act="' + act + '"][data-v="' + v + '"]'); await page.waitForTimeout(12); };
  const bigs = () => page.$$eval('.lab .big', els => els.map(e => [e.querySelector('b').textContent, e.querySelector('span').textContent, e.className.replace('big', '').trim()]));
  const tables = () => page.$$eval('.lab .tbl', ts => ts.map(t => [...t.querySelectorAll('tbody tr')].map(r => [...r.children].map(td => td.innerText.trim()))));
  const rowClasses = () => page.$$eval('.lab .tbl tbody tr', rs => rs.map(r => r.className));
  const chipOn = act => page.$$eval('[data-act="' + act + '"].on', els => els.map(e => e.getAttribute('data-v')));
  const chipVals = act => page.$$eval('[data-act="' + act + '"]', els => els.map(e => e.getAttribute('data-v')));
  const callouts = () => page.$$eval('.lab .callout', els => els.map(e => [e.className.replace('callout', '').trim(), e.innerText.replace(/\s+/g, ' ').trim()]));
  const lanes = () => page.$$eval('.lab .lane', els => els.map(l => [l.querySelector('.lane-n').textContent, l.querySelector('.lane-v').textContent, l.querySelector('i').className]));
  const codes = () => page.$$eval('.lab pre', els => els.map(e => e.innerText.trim()));
  const heads = () => page.$$eval('.lab .lab-h', els => els.map(e => e.innerText.trim()));
  const noRaw = async where => { const t = await page.$eval('.lab', el => el.innerText); ok(!/[`]|\*\*|<\/?[a-z][a-z0-9]*[ >]|undefined|NaN|\[object Object\]/.test(t), where + ' shows no raw markup, undefined or NaN: ' + (t.match(/.{0,30}([`]|\*\*|<\/?[a-z][a-z0-9]*[ >]|undefined|NaN|\[object Object\]).{0,30}/) || [''])[0]); };
  const section = async (name, fn) => { try { await fn(); } catch (e) { fail++; console.log('FAIL:', name, 'threw', String(e.message).split('\n')[0]); } };

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 1: the build cache. A step runs again when the first changed step is at or above it.
  await section('cache lab', async () => {
    await open('cache');
    eq(await chipVals('ca-o'), ['copy first', 'dependencies first'], 'cache lab: two orders');
    eq(await chipVals('ca-c'), ['nothing', 'one line of load_orders.py', 'requirements.txt'], 'cache lab: three changes');
    const plan = { 'copy first': [['WORKDIR /app', null], ['COPY . .', 'any'], ['RUN pip install --no-cache-dir -r requirements.txt', 'req']], 'dependencies first': [['WORKDIR /app', null], ['COPY requirements.txt .', 'req'], ['RUN pip install --no-cache-dir -r requirements.txt', 'req'], ['COPY load_orders.py worker.py ./', 'code']] };
    for (const order of Object.keys(plan)) for (const change of ['nothing', 'one line of load_orders.py', 'requirements.txt']) {
      await pick('ca-o', order); await pick('ca-c', change);
      eq([await chipOn('ca-o'), await chipOn('ca-c')], [[order], [change]], 'cache lab: ' + order + ' / ' + change + ' is selected');
      let again = false;
      const want = plan[order].map(([cmd, reads]) => { if (reads && (reads === 'any' ? change !== 'nothing' : change === 'requirements.txt' ? reads === 'req' : change.startsWith('one line') ? reads === 'code' : false)) again = true; return [cmd, again ? 'ran again' : 'taken from the cache']; });
      const t = (await tables())[0];
      eq(t.map(r => [r[1], r[2]]), want, 'cache lab, ' + order + ' / ' + change + ': instructions and what the build did');
      eq(t.map(r => r[0]), want.map((_, k) => String(k + 1)), 'cache lab: step numbers');
      const ran = want.filter(w => w[1] === 'ran again').length, pip = want.some(w => /pip install/.test(w[0]) && w[1] === 'ran again');
      const b = await bigs();
      eq([b[0][0], b[1][0]], [ran + ' of ' + want.length, pip ? 'yes' : 'no'], 'cache lab, ' + order + ' / ' + change + ': steps that ran again and pip');
      eq(b[1][2], pip ? 'bad' : 'good', 'cache lab: pip is marked');
      eq((await rowClasses()).map(c => c === 'dup' ? 'ran again' : 'taken from the cache'), want.map(w => w[1]), 'cache lab: rows that ran again are marked');
      await noRaw('cache lab, ' + order + ' / ' + change);
    }
  });

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 2: sizes
  await section('size lab', async () => {
    await open('size');
    eq(await chipVals('sz-t'), ['base', 'pkgs', 'rm', 'test'], 'size lab: four experiments');
    const B = T('small.bases').rows, H = C('small.heavy'), RM = C('small.rm'), ST = C('small.stages');
    await pick('sz-t', 'base');
    eq((await lanes()).map(l => [l[0], l[1]]), B.map(r => [r[0], mb(r[1]) + ', ' + r[2] + ' layers']), 'size lab: the three bases and their layers');
    const c1 = (await callouts())[0][1];
    ok(c1.includes((B[0][1] / B[1][1]).toFixed(1) + ' times') && c1.includes((B[1][1] / B[2][1]).toFixed(1) + ' times'), 'size lab: the callout quotes both ratios');
    await noRaw('size lab, base');
    await pick('sz-t', 'pkgs');
    eq((await lanes()).map(l => [l[0], l[1]]), [['python:3.13-slim', mb(H.slim.size)], ['python:3.13-alpine', mb(H.alpine.size)]], 'size lab: two bases with the same packages');
    const b2 = await bigs();
    eq([b2[0][0], b2[1][0], b2[2][0]], [((1 - H.alpine.size / H.slim.size) * 100).toFixed(0) + ' %', mb(H.slim.size - B[1][1]), H.slim.pandas], 'size lab: saving, added by packages, versions');
    await noRaw('size lab, packages');
    await pick('sz-t', 'rm');
    eq((await lanes()).map(l => [l[1], l[2]]), [[mb(RM.base), ''], [mb(RM.later_layer), 'bad'], [mb(RM.same_layer), 'good']], 'size lab: three images and their marks');
    ok((await callouts())[0][1].includes(mb(RM.file_bytes)), 'size lab: the callout names the 50 MiB file in MB');
    await noRaw('size lab, deleted file');
    await pick('sz-t', 'test');
    eq((await lanes()).map(l => l[1]), [mb(ST.test_image_size), mb(ST.runtime_image_size)], 'size lab: test and runtime images');
    const b4 = await bigs();
    eq([b4[0][0], b4[1][0], b4[2][0]], ['True', 'False', 'no'], 'size lab: pytest in each image, and the plain build');
    await noRaw('size lab, stages');
  });

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 3: what survives. The anonymous volume and the bind mount keep the rows through a stop; tmpfs keeps nothing.
  await section('volume lab', async () => {
    await open('vol');
    const ways = ['no volume flag', 'named volume', 'bind mount of a host folder', 'tmpfs (memory)'];
    eq(await chipVals('vo-w'), ways, 'volume lab: four ways');
    eq(await chipVals('vo-a'), ['1', '2'], 'volume lab: two actions');
    const survives = { 'no volume flag': [true, false], 'named volume': [true, true], 'bind mount of a host folder': [true, true], 'tmpfs (memory)': [false, false] };
    for (const w of ways) for (const a of [1, 2]) {
      await pick('vo-w', w); await pick('vo-a', a);
      const keep = survives[w][a - 1], b = await bigs(), co = (await callouts())[0];
      eq([b[0][0], b[0][2], b[1][0]], [keep ? '5,000' : 'no table', keep ? 'good' : 'bad', '5,000'], 'volume lab, ' + w + ' / action ' + a + ': rows now and before');
      eq(co[0], keep ? 'good' : 'bad', 'volume lab, ' + w + ' / action ' + a + ': callout kind');
      if (w === 'no volume flag' && a === 2) ok(co[1].includes('1 dangling volume'), 'volume lab: the callout says that one dangling volume is left');
      if (w === 'bind mount of a host folder') ok(co[1].includes('70:70') && co[1].includes('600'), 'volume lab: the callout quotes the owner and the mode');
      await noRaw('volume lab, ' + w + ' / ' + a);
    }
  });

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 4: nine attempts to connect
  await section('network lab', async () => {
    await open('net');
    const ks = await chipVals('nt-k');
    eq(ks, ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9'], 'network lab: nine attempts');
    const works = { a1: false, a2: true, a3: true, a4: false, a5: false, a6: false, a7: true, a8: true, a9: false };
    const texts = { a3: X('net.byname'), a4: X('net.localhost'), a5: X('net.wrongname'), a7: X('net.port1'), a8: X('net.port2'), a9: X('net.busy') };
    for (const k of ks) {
      await pick('nt-k', k);
      eq(await chipOn('nt-k'), [k], 'network lab: ' + k + ' is selected');
      const b = await bigs(), c = await codes(), co = (await callouts())[0];
      eq([b[0][0], b[0][2]], [works[k] ? 'it works' : 'it fails', works[k] ? 'good' : 'bad'], 'network lab, ' + k + ': the result');
      eq(co[0], works[k] ? 'good' : 'bad', 'network lab, ' + k + ': callout kind');
      if (texts[k]) ok(c[1].includes(texts[k]), 'network lab, ' + k + ': the recorded output is shown');
      await noRaw('network lab, ' + k);
    }
    await pick('nt-k', 'a1');
    ok((await codes())[1].includes('exit code ' + C('net.default').resolve_by_name_rc), 'network lab: a1 shows the recorded exit code');
  });

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 5: limits. A job is killed when it asks for more than its limit. Python reports the CPUs of the host.
  await section('limits lab', async () => {
    await open('limits');
    const ks = await chipVals('lm-k');
    eq(ks, ['m0', 'm1', 'm2', 'c0', 'c1', 'c2'], 'limits lab: six cases');
    const O = T('jobs.oom').rows, CP = C('jobs.cpus');
    for (let i = 0; i < 3; i++) {
      await pick('lm-k', 'm' + i);
      const killed = parseInt(O[i][1], 10) > parseInt(O[i][0], 10), b = await bigs();
      eq([b[0][0], b[1][0], b[0][2]], [killed ? '137' : '0', killed ? 'true' : 'false', killed ? 'bad' : 'good'], 'limits lab, ' + O[i][0] + ' / ' + O[i][1] + ': exit code, OOMKilled and mark');
      eq(b[2][0], killed ? '(nothing printed)' : 'allocated ' + parseInt(O[i][1], 10) + ' MB', 'limits lab: what the job printed');
      eq((await callouts())[0][0], killed ? 'bad' : 'good', 'limits lab: callout kind');
      await noRaw('limits lab, memory ' + i);
    }
    for (const [k, key] of [['c0', 'no_limit'], ['c1', 'cpus_0_5'], ['c2', 'cpuset_0']]) {
      await pick('lm-k', k);
      const b = await bigs();
      eq([b[0][0], b[1][0]], [String(CP[key].cpu_count), String(CP[key].process_cpu_count)], 'limits lab, ' + k + ': os.cpu_count() and os.process_cpu_count()');
      await noRaw('limits lab, ' + k);
    }
    await pick('lm-k', 'c1');
    ok((await callouts())[0][1].includes('time quota'), 'limits lab: --cpus 0.5 is explained as a quota');
  });

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 6: docker stop. A signal reaches the job only when it is process 1. Process 1 ignores a signal that it does not handle.
  await section('stop lab', async () => {
    await open('stop');
    const ks = await chipVals('sp-k');
    eq(ks, ['0', '1', '2', '3', '4'], 'stop lab: five cases');
    const want = [[1, true, 137, false], [1, false, 0, true], [7, true, 137, false], [1, false, 0, true], [7, false, 143, false]];
    for (const k of ks) {
      await pick('sp-k', k);
      const w = want[+k], b = await bigs(), l = await lanes();
      eq([b[0][0], b[1][0], b[2][0], b[3][0]], [String(w[0]), w[1] ? 'waited 3 s, then killed' : 'stopped at once', String(w[2]), w[3] ? 'yes' : 'no'], 'stop lab, case ' + k + ': process id, wait, exit code, handler');
      eq(l[0][1], w[1] ? 'SIGKILL at 3 s' : 'exited at once', 'stop lab, case ' + k + ': the grace period bar');
      eq(l[0][2], w[1] ? 'bad' : 'good', 'stop lab, case ' + k + ': the bar is marked');
      await noRaw('stop lab, case ' + k);
    }
    // the same table as the recording
    eq(T('jobs.signals').rows.map(r => [r[1], r[2] === 'yes', r[3], r[4] === 'yes']), want.map((w, k) => k === 2 || k === 4 ? [w[0] === 7 ? T('jobs.signals').rows[k][1] : 1, w[1], w[2], w[3]] : w), 'stop lab: the recording agrees with the cases');
  });

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 7: tags. Before the move nothing differs. After it, only a pull changes what runs, and a tag that nobody moved or a digest runs build 1.
  await section('tags lab', async () => {
    await open('tags');
    eq(await chipVals('tg-s'), ['1', '2'], 'tags lab: two states');
    eq(await chipVals('tg-a'), ['run', 'pull', 'tag', 'digest'], 'tags lab: four commands');
    const S = T('registry.steps').rows;
    const out = (st, a) => a === 'tag' || a === 'digest' ? 'this is build 1' : st === 1 ? 'this is build 1' : a === 'run' ? 'this is build 1' : 'this is build 2';
    for (const st of [1, 2]) for (const a of ['run', 'pull', 'tag', 'digest']) {
      await pick('tg-s', st); await pick('tg-a', a);
      const b = await bigs(), row = S[st - 1];
      eq([b[0][0], b[1][0], b[2][0]], [row[1], row[2], out(st, a)], 'tags lab, state ' + st + ' / ' + a + ': digests and what runs');
      eq(b[1][2], row[1] === row[2] ? 'good' : 'bad', 'tags lab: the local digest is marked');
      const co = (await callouts())[0];
      if (st === 2 && a === 'run') ok(co[0] === 'bad' && co[1].includes('build 1'), 'tags lab: the stale run is flagged');
      if (st === 2 && a === 'pull') ok(co[0] === 'good' && co[1].includes('build 2'), 'tags lab: a pull fixes it');
      await noRaw('tags lab, ' + st + ' / ' + a);
    }
    const note = await page.$eval('.lab-note', e => e.innerText);
    ok(/computed/i.test(note) === false, 'tags lab: state 2 with a pull is a recorded case, so no computed note');
    await pick('tg-s', 1); await pick('tg-a', 'pull');
    ok(/computed/i.test(await page.$eval('.lab-note', e => e.innerText)), 'tags lab: state 1 with a pull is computed, and says so');
  });

  ok(errs.length === 0, 'no console errors or page errors: ' + errs.slice(0, 3).join(' | '));
  await browser.close(); srv.close();
  console.log(fail ? fail + ' of ' + (pass + fail) + ' lab checks failed' : pass + ' lab checks passed');
  process.exit(fail ? 1 : 0);
})();
