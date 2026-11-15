// End-to-end test of the 6 labs of the Git course, in a real browser.
// It opens git/index.html, clicks every chip of every lab, and compares what the page shows with
//   (a) what was recorded (git/js/real.js), and
//   (b) values that are worked out in this file: the status code from three ids, the commits and merge commits counted in the printed graph,
//       where the change is after each reset, whether a push changed the remote (read from the words Git printed), the bars of the size lab, and the suspects of each bisect test.
// Nothing is read from the widget code. A lab that shows a wrong number or a stale label fails here, even when the data behind it passes
// verify/check_widgets.js. No step may show an HTML tag, backticks, asterisks, "undefined" or "NaN" as text.
// Needs Playwright:  npm install playwright && npx playwright install chromium
// Run: node git/verify/e2e_labs.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + '\n   got  ' + JSON.stringify(a) + '\n   want ' + JSON.stringify(b));
const fmt = v => Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 });

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
  await page.addInitScript(() => { try { localStorage.setItem('dep.git.v1', JSON.stringify({ track: 'all', chosen: true })); } catch (e) { /* ignore */ } });
  await page.goto('http://127.0.0.1:' + srv.address().port + '/git/index.html'); await page.waitForTimeout(300);

  const REAL = await page.evaluate(() => LAB.real), C = k => REAL.counts[k], T = k => REAL.tables[k], X = k => REAL.text[k];
  const sceneOf = kind => page.evaluate(k => { let f = null; LAB.chapters.forEach(c => c.scenes.forEach(s => { if (s.type === 'widget' && s.kind === k) f = s.id; })); return f; }, kind);
  const open = async kind => { const id = await sceneOf(kind); ok(!!id, 'the course has a lab of kind ' + kind); await page.evaluate(k => { location.hash = k + ':0'; }, id); await page.waitForTimeout(60); };
  const pick = async (act, v) => { await page.click('[data-act="' + act + '"][data-v="' + v + '"]'); await page.waitForTimeout(12); };
  const bigs = () => page.$$eval('.lab .big', els => els.map(e => [e.querySelector('b').textContent, e.querySelector('span').textContent, e.className.replace('big', '').trim()]));
  const tables = () => page.$$eval('.lab .tbl', ts => ts.map(t => [...t.querySelectorAll('tbody tr')].map(r => [...r.children].map(td => td.innerText.trim()))));
  const heads = () => page.$$eval('.lab .tbl', ts => ts.map(t => [...t.querySelectorAll('thead th')].map(th => th.innerText.trim())));
  const chipOn = act => page.$$eval('[data-act="' + act + '"].on', els => els.map(e => e.getAttribute('data-v')));
  const chipVals = act => page.$$eval('[data-act="' + act + '"]', els => els.map(e => e.getAttribute('data-v')));
  const chipTexts = act => page.$$eval('[data-act="' + act + '"]', els => els.map(e => e.innerText.trim()));
  const callouts = () => page.$$eval('.lab .callout', els => els.map(e => [e.className.replace('callout', '').trim(), e.innerText.replace(/\s+/g, ' ').trim()]));
  const lanes = () => page.$$eval('.lab .lane', els => els.map(l => [l.querySelector('.lane-n').textContent, l.querySelector('.lane-v').textContent, l.querySelector('i').className.trim(), l.querySelector('i').getAttribute('style')]));
  const pres = () => page.$$eval('.lab pre', els => els.map(e => e.innerText.replace(/\n+$/, '')));
  const notes = () => page.$eval('.lab .lab-note', e => e.innerText.replace(/\s+/g, ' ').trim());
  const noRaw = async where => { const t = await page.$eval('.lab', el => el.innerText); ok(!/[`]|\*\*|<\/?[a-z][a-z0-9]*[ >]|undefined|NaN|\[object Object\]/.test(t), where + ' shows no raw markup, undefined or NaN: ' + (t.match(/.{0,30}([`]|\*\*|<\/?[a-z][a-z0-9]*[ >]|undefined|NaN|\[object Object\]).{0,30}/) || [''])[0]); };
  const section = async (name, fn) => { try { await fn(); } catch (e) { fail++; console.log('FAIL:', name, 'threw', String(e.message).split('\n')[0]); } };
  const trim = s => s.replace(/\s+$/gm, '');

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 1: where a file is after each step. The status code is worked out from the three ids.
  await section('areas lab', async () => {
    await open('areas');
    const rows = T('areas.steps').rows;
    eq(await chipVals('ar-k'), rows.map((r, i) => String(i)), 'areas lab: one chip for each of the six steps');
    eq((await chipTexts('ar-k')).map(t => t.replace(/^\d+\. /, '')), rows.map(r => r[0]), 'areas lab: the chips carry the names of the steps');
    for (let i = 0; i < rows.length; i++) {
      await pick('ar-k', String(i));
      eq(await chipOn('ar-k'), [String(i)], 'areas lab: step ' + (i + 1) + ' is selected');
      const [, cmd, wt, ix, hd] = rows[i];
      const b = await bigs();
      eq([b[0][0], b[1][0], b[2][0]], [wt, ix, hd], 'areas lab, step ' + (i + 1) + ': the three ids');
      eq([b[0][1], b[1][1], b[2][1]], ['working tree', 'index (staged)', 'last commit'], 'areas lab, step ' + (i + 1) + ': the three places are named');
      eq([b[0][2], b[1][2], b[2][2]], [wt !== ix ? 'warn' : '', ix !== hd ? 'warn' : '', ''], 'areas lab, step ' + (i + 1) + ': an id is marked when it differs from the one on its right');
      const want = wt === ix && ix === hd ? '(clean)' : ix === hd ? ' M' : wt === ix ? 'M ' : 'MM';
      const shown = (await pres())[0];
      eq(shown.split('\n')[0], '$ git status --short models/orders_daily.sql', 'areas lab, step ' + (i + 1) + ': the command');
      const out = shown.split('\n').slice(1).join('\n');
      ok(want === '(clean)' ? out === '(clean)' : out.startsWith(want + ' models/orders_daily.sql'), 'areas lab, step ' + (i + 1) + ': the status line "' + out + '" matches the code worked out from the ids (' + JSON.stringify(want) + ')');
      const kind = { '(clean)': 'good', ' M': 'warn', 'M ': 'good', 'MM': 'bad' }[want], text = (await callouts())[0];
      eq(text[0], kind, 'areas lab, step ' + (i + 1) + ': the callout kind');
      ok(want === 'MM' ? /not staged/.test(text[1]) || /newer edit/.test(text[1]) : true, 'areas lab, step ' + (i + 1) + ': the MM state explains the left-behind edit');
      if (cmd) ok(text[1].indexOf(cmd.startsWith('(') ? 'The step was an edit in an editor.' : 'The step was ' + cmd + '.') >= 0, 'areas lab, step ' + (i + 1) + ': the text names the step ' + cmd);
      await noRaw('areas lab, step ' + (i + 1));
    }
  });

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 2: merge, rebase or squash. Commits and merge commits are counted in the graph that is printed.
  await section('mr lab', async () => {
    await open('mr');
    eq(await chipVals('mr-k'), ['merge', 'rebase', 'squash'], 'mr lab: three ways to join');
    const ID = C('mr.ids'), main = 3, feature = 2;
    const want = { merge: { commits: main + feature + 1, merges: 1, kept: true }, rebase: { commits: main + feature, merges: 0, kept: false }, squash: { commits: main + 1, merges: 0, kept: false } };
    for (const k of Object.keys(want)) {
      await pick('mr-k', k);
      eq(await chipOn('mr-k'), [k], 'mr lab: ' + k + ' is selected');
      const shown = (await pres())[0], lines = shown.split('\n').slice(1);
      eq(shown.split('\n')[0], '$ git log --oneline --graph', 'mr lab, ' + k + ': the command');
      const commitLines = lines.filter(l => /^[|\\/ ]*\*[ |\\/]*[0-9a-f]{7}\b/.test(l));
      const b = await bigs();
      eq([commitLines.length, commitLines.filter(l => /^[|\\/ ]*\*[ |\\/]*[0-9a-f]{7}( \([^)]*\))? Merge /.test(l)).length], [want[k].commits, want[k].merges], 'mr lab, ' + k + ': commits and merge commits counted in the graph');
      eq([b[0][0], b[1][0], b[2][0]], [String(want[k].commits), String(want[k].merges), want[k].kept ? 'kept' : 'new or gone'], 'mr lab, ' + k + ': the three numbers agree with the graph');
      const printed = new Set(commitLines.map(l => /^[|\\/ ]*\*[ |\\/]*([0-9a-f]{7})\b/.exec(l)[1]));
      ok(want[k].kept ? printed.has(ID.F1) && printed.has(ID.F2) : !printed.has(ID.F1) && !printed.has(ID.F2), 'mr lab, ' + k + ': the old ids of the feature commits are ' + (want[k].kept ? 'in' : 'not in') + ' the graph');
      if (k === 'rebase') ok(printed.has(ID.F1r) && printed.has(ID.F2r), 'mr lab rebase: the new ids are in the graph');
      if (k === 'merge') ok(printed.has(ID.M), 'mr lab merge: the merge commit ' + ID.M + ' is in the graph');
      const note = await notes();
      ok(want[k].kept ? note.indexOf(ID.F1) >= 0 && note.indexOf(ID.F2) >= 0 : k === 'rebase' ? note.indexOf(ID.F1r) >= 0 && note.indexOf(ID.F2r) >= 0 : /one new commit/.test(note), 'mr lab, ' + k + ': the note names the ids');
      eq((await callouts())[0][0], 'tip', 'mr lab, ' + k + ': the callout kind');
      await noRaw('mr lab, ' + k);
    }
  });

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 3: how far an undo goes. Where the rate 0.09 is, after each command.
  await section('undo lab', async () => {
    await open('undo');
    const rows = T('un.reset').rows;
    eq(await chipVals('un-k'), rows.map((r, i) => String(i)), 'undo lab: one chip for each of five commands');
    eq(await chipTexts('un-k'), rows.map(r => r[0]), 'undo lab: the chips carry the commands');
    const model = { 'start': ['0.09', '0.09', '0.09', 3], 'git reset --soft HEAD~1': ['0.08', '0.09', '0.09', 2], 'git reset --mixed HEAD~1': ['0.08', '0.08', '0.09', 2], 'git reset --hard HEAD~1': ['0.08', '0.08', '0.08', 2], 'git revert HEAD': ['0.08', '0.08', '0.08', 4] };
    for (let i = 0; i < rows.length; i++) {
      const name = rows[i][0], m = model[name];
      await pick('un-k', String(i));
      eq(await chipOn('un-k'), [String(i)], 'undo lab: ' + name + ' is selected');
      const b = await bigs();
      eq(b.map(x => x[0]), [m[0], m[1], m[2], String(m[3])], 'undo lab, ' + name + ': rate in the commit, the index, the file, and the number of commits');
      eq(b.slice(0, 3).map(x => x[2]), m.slice(0, 3).map(r => r === '0.09' ? 'warn' : ''), 'undo lab, ' + name + ': the place that still has 0.09 is marked');
      const where = m[2] === '0.09' ? 'in the file' : m[1] === '0.09' ? 'staged' : m[0] === '0.09' ? 'only in the old commit' : 'gone from this branch';
      ok((await notes()).indexOf('The change 0.09 is: ' + where + '.') >= 0, 'undo lab, ' + name + ': the note says the change is ' + where);
      const c = (await callouts())[0];
      eq(c[0], /hard/.test(name) ? 'bad' : 'good', 'undo lab, ' + name + ': the callout kind');
      const must = { 'start': 'Nothing was undone', 'git reset --soft HEAD~1': 'Only the branch moved', 'git reset --mixed HEAD~1': 'This is the default of git reset', 'git reset --hard HEAD~1': 'git reflog can find it', 'git revert HEAD': 'a new commit' }[name];
      ok(c[1].indexOf(must) >= 0, 'undo lab, ' + name + ': the text says "' + must + '"');
      await noRaw('undo lab, ' + name);
    }
  });

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 4: six pushes. Whether the remote changed is read from the words that Git printed.
  await section('push lab', async () => {
    await open('push');
    const keys = ['first', 'rejected', 'pull', 'rebase', 'lease', 'force'];
    eq(await chipVals('pu-k'), keys, 'push lab: six pushes');
    const cmd = { first: 'git push -u origin main', rejected: 'git push origin main', pull: 'git pull', rebase: 'git pull --rebase && git push origin main', lease: 'git push --force-with-lease origin main', force: 'git push --force origin main' };
    const out = { first: X('rm.push_first'), rejected: X('rm.push_rejected'), pull: X('rm.pull_plain'), rebase: X('rm.pull_rebase') + '\n' + X('rm.push_ok'), lease: X('rm.force_with_lease'), force: X('rm.force') };
    for (const k of keys) {
      await pick('pu-k', k);
      eq(await chipOn('pu-k'), [k], 'push lab: ' + k + ' is selected');
      eq(trim((await pres())[0]), trim('$ ' + cmd[k] + '\n' + out[k]), 'push lab, ' + k + ': the command and the words Git printed, exactly');
      const changed = !/\[rejected\]|fatal:|error: failed to push/.test(out[k]);
      const b = await bigs(), dangerous = k === 'force';
      eq([b[0][0], b[0][2]], [changed ? 'yes' : 'no', changed ? (dangerous ? 'bad' : 'good') : 'warn'], 'push lab, ' + k + ': whether the remote changed, worked out from the printed words');
      const c = (await callouts())[0];
      eq(c[0], dangerous ? 'bad' : changed ? 'good' : 'tip', 'push lab, ' + k + ': the callout kind');
      const must = { first: 'accepted', rejected: 'exit code ' + C('rm.push_rejected').rc, pull: 'exit code ' + C('rm.pull_plain').rc, rebase: C('rm.pull_rebase').commits + ' commits, ' + C('rm.pull_rebase').merge_commits + ' merge commits', lease: 'stale info', force: 'forced update' }[k];
      ok(c[1].indexOf(must) >= 0, 'push lab, ' + k + ': the text says "' + must + '"');
      if (k === 'rejected') ok(/\(fetch first\)/.test(out[k]), 'push lab rejected: the printed words say fetch first');
      if (k === 'lease') ok(/stale info/.test(out[k]), 'push lab lease: the printed words say stale info');
      if (k === 'force') ok(/forced update/.test(out[k]) && /still existed in the remote repository \(true\)/.test(c[1]), 'push lab force: forced update, and the commit is still in the remote repository');
      await noRaw('push lab, ' + k);
    }
  });

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 5: how a data file grows a repository. The bars are in proportion, and every number is the one that was measured.
  await section('size lab', async () => {
    await open('size');
    eq(await chipVals('sz-k'), ['append', 'rewrite'], 'size lab: two cases');
    const D = C('data.sizes'), rowsT = T('data.sizes').rows, clones = T('data.clones');
    for (const [k, ti] of [['append', 0], ['rewrite', 1]]) {
      await pick('sz-k', k);
      eq(await chipOn('sz-k'), [k], 'size lab: ' + k + ' is selected');
      const d = D[k], one = d.file_bytes / 1024, max = Math.max(d.loose_kib, d.after_gc_kib), L = await lanes();
      eq(L.map(l => l[1]), [fmt(Math.round(one)) + ' KiB', fmt(d.loose_kib) + ' KiB', fmt(d.after_gc_kib) + ' KiB'], 'size lab, ' + k + ': the three sizes');
      const widths = L.map(l => +/width:([\d.]+)%/.exec(l[3])[1]);
      [one, d.loose_kib, d.after_gc_kib].forEach((v, i) => ok(Math.abs(widths[i] - Math.min(100, Math.max(1, v / max * 100))) < 0.01, 'size lab, ' + k + ': bar ' + (i + 1) + ' is ' + v.toFixed(0) + ' of ' + max + ' wide: ' + widths[i]));
      eq(L[2][2], k === 'append' ? 'good' : 'bad', 'size lab, ' + k + ': the colour of the last bar');
      eq(+(d.after_gc_kib * 1024 / d.file_bytes).toFixed(2), d.times_the_file, 'size lab, ' + k + ': times the file, worked out from the sizes');
      const b = await bigs();
      eq([b[0][0], b[1][0]], [d.times_the_file.toFixed(2) + ' x', String(d.loose_objects)], 'size lab, ' + k + ': the two numbers');
      eq([b[0][2], b[1][2]], [k === 'append' ? 'good' : 'bad', ''], 'size lab, ' + k + ': the colour of the number of copies (good below one copy, bad above)');
      ok((d.times_the_file < 1) === (k === 'append'), 'size lab, ' + k + ': the colour agrees with the number: ' + d.times_the_file + ' copies');
      eq([rowsT[ti][3], rowsT[ti][4], rowsT[ti][5]], [d.loose_kib, d.after_gc_kib, d.times_the_file], 'size lab, ' + k + ': the recorded table row is the same');
      const c = (await callouts())[0];
      eq(c[0], k === 'append' ? 'good' : 'bad', 'size lab, ' + k + ': the callout kind');
      ok(k === 'append' ? /less than one copy/.test(c[1]) : c[1].indexOf('about ' + d.times_the_file.toFixed(1) + ' copies') >= 0, 'size lab, ' + k + ': the text agrees with the numbers');
      eq(await tables(), [clones.rows.map(r => r.map(String))], 'size lab, ' + k + ': the table of clones is the recorded one');
      eq((await heads())[0], clones.cols, 'size lab, ' + k + ': the columns of that table');
      await noRaw('size lab, ' + k);
    }
  });

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 6: bisect. The range after each test is worked out from the order of the tests.
  await section('bisect lab', async () => {
    await open('bisect');
    const B = C('hist.bisect_tests'), H = C('hist');
    eq(await chipVals('bi-k'), ['0', '1', '2', '3', '4'], 'bisect lab: no test, then four');
    eq(await chipTexts('bi-k'), ['none', '1', '2', '3', '4'], 'bisect lab: the chips');
    let lo = 1, hi = B.commits;
    for (let k = 0; k <= B.tests.length; k++) {
      let tested = null, verdict = null;
      if (k > 0) { [verdict, tested] = B.tests[k - 1]; if (verdict === 'good') lo = tested; else hi = tested; }
      await pick('bi-k', String(k));
      eq(await chipOn('bi-k'), [String(k)], 'bisect lab: test ' + k + ' is selected');
      const cells = await page.$$eval('.lab .parts .part', els => els.map(e => [e.firstChild.textContent, e.querySelector('small').textContent, e.className.replace('part', '').trim()]));
      eq(cells.map(c => c[0]), Array.from({ length: B.commits }, (_, i) => String(i + 1)), 'bisect lab, test ' + k + ': one cell for each of the sixteen commits');
      const suspects = cells.filter(c => c[1] === 'suspect').length;
      eq(suspects, Math.max(0, hi - lo - 1), 'bisect lab, test ' + k + ': the suspects are the commits between the last good and the first bad');
      cells.forEach((c, i) => { const n = i + 1; if (n < lo || (n === tested && verdict === 'good')) ok(c[2] === 'fixed', 'bisect lab, test ' + k + ': commit ' + n + ' is marked good'); if (n > hi || (n === tested && verdict === 'bad')) ok(c[2] === 'stale', 'bisect lab, test ' + k + ': commit ' + n + ' is marked bad'); if (n > lo && n < hi && n !== tested) ok(c[2] === '', 'bisect lab, test ' + k + ': commit ' + n + ' is unmarked'); });
      eq(cells.map(c => c[1]), cells.map((c, i) => i + 1 <= lo ? 'good' : i + 1 >= hi ? 'bad' : 'suspect'), 'bisect lab, test ' + k + ': every commit is labelled good, bad or suspect from the range that is left');
      const b = await bigs();
      eq([b[0][0], b[1][0], b[2][0]], [tested ? '#' + tested + ' ' + verdict : 'start', String(Math.max(0, hi - lo - 1)), String(k)], 'bisect lab, test ' + k + ': the three numbers');
      const c = (await callouts())[0];
      if (k === B.tests.length) {
        eq([lo + 1, hi, H.bad_position], [H.bad_position, H.bad_position, H.bad_position], 'bisect lab: the last good commit and the first bad one are neighbours, at the recorded position');
        ok(c[0] === 'good' && c[1].indexOf('#' + hi) >= 0 && c[1].indexOf(H.bad_commit) >= 0 && c[1].indexOf(B.tests.length + ' tests') >= 0, 'bisect lab, last test: the text names commit #' + hi + ' and ' + H.bad_commit);
      } else ok(c[0] === 'tip', 'bisect lab, test ' + k + ': the callout kind is tip until the last test');
      await noRaw('bisect lab, test ' + k);
    }
  });

  ok(errs.length === 0, 'the page logged no errors: ' + errs.join(' | '));
  await browser.close(); srv.close();
  console.log(fail ? fail + ' FAILED, ' + pass + ' lab checks passed' : pass + ' lab checks passed');
  process.exit(fail ? 1 : 0);
})();
