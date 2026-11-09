// End-to-end behaviour test for one tutorial: it reads every scene definition and exercises the interactive
// elements of each scene type with assertions (quiz, bug hunt, order, decision, incident, Q&A, coding problem,
// SQL run, terminal, widgets, boss round), then the app itself (keys, text size, map, paths, saving, reset).
// Needs Playwright:  npm install playwright && npx playwright install chromium
// Run: node dev/e2e.js snowflake
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const name = process.argv[2] || 'snowflake';
const root = path.join(__dirname, '..');
const storageKey = (fs.readFileSync(path.join(root, name, 'js', 'config.js'), 'utf8').match(/storageKey:\s*'([^']+)'/) || [])[1];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };

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
  page.on('dialog', d => d.accept());
  await page.addInitScript(([k]) => { if (!sessionStorage.getItem('e2e-init')) { try { localStorage.setItem(k, JSON.stringify({ track: 'all', chosen: true })); } catch (e) {} sessionStorage.setItem('e2e-init', '1'); } }, [storageKey]);
  await page.goto(url); await page.waitForTimeout(400);

  const S = await page.evaluate(() => LAB.chapters.flatMap(c => c.scenes.map(s => ({
    id: s.id, type: s.type, ch: c.id, n: LAB.R[s.type].steps(s), ok: s.ok, nopts: (s.opts || []).length, bad: s.bad == null ? null : [].concat(s.bad), pick: s.pick, best: s.best,
    items: s.items && s.items.length, steps: s.steps && s.steps.map(x => ({ on: (x.on || []).length, upto: x.upto, lines: !!x.lines, run: !!x.run, tabs: (x.tabs || []).length })),
    rows: s.rows && s.rows.length, pts: s.pts && s.pts.length, long: !!s.long, fu: s.fu && s.fu.length, hints: s.hints && s.hints.length, result: !!s.result, resultRows: s.result && s.result.rows.length,
    after: !!s.after, nlines: typeof s.lines === 'function' ? s.lines().length : (s.lines && s.lines.length), checks: s.checks && s.checks.length, prevent: s.prevent && s.prevent.length,
    sections: s.sections && s.sections.length, qid: s.qid, goals: s.goals && s.goals.length, itemsN: s.items && s.items.length, kind: s.kind, t: s.t
  }))));
  const go = async key => { await page.evaluate(k => { location.hash = k; }, key); await page.waitForTimeout(25); };
  const q = (sel) => page.$$(sel);
  const cnt = async sel => (await q(sel)).length;
  const state = () => page.evaluate(() => JSON.parse(JSON.stringify(LAB.app.state)));
  const text = () => page.evaluate(() => document.querySelector('#stage-body').innerText);

  // ---------- welcome ----------
  await go('welcome:0');
  ok(await cnt('.track') === 3, 'welcome shows three path cards');

  for (const s of S) {
    const key = s.id + ':0';
    await go(key);
    const where = s.id + ' (' + s.type + ')';
    const stage = await text();
    ok(!/undefined|NaN|\[object Object\]/.test(stage), where + ' has no undefined/NaN text');

    if (s.type === 'intro') ok(await cnt('.goals li') === s.goals, where + ' lists all goals');
    if (s.type === 'quiz') {
      const wrong = [...Array(s.nopts).keys()].find(k => k !== s.ok);
      await page.click('.opt[data-k="' + wrong + '"]'); await page.waitForTimeout(15);
      ok(await cnt('.callout.bad') === 1, where + ' wrong answer shows feedback');
      await page.click('.opt[data-k="' + s.ok + '"]'); await page.waitForTimeout(15);
      ok(await cnt('.opt.right') === 1 && await cnt('.callout.good') === 1, where + ' right answer is confirmed');
    }
    if (s.type === 'bug') {
      const lines = await cnt('.code .ln.clk');
      const notBad = [...Array(lines).keys()].map(k => k + 1).find(n => !s.bad.includes(n));
      await page.click('.code:not(.fixc) .ln.clk[data-n="' + notBad + '"]'); await page.waitForTimeout(15);
      ok(await cnt('.callout.bad') === 1, where + ' wrong line shows feedback');
      await page.click('.code:not(.fixc) .ln.clk[data-n="' + s.bad[0] + '"]'); await page.waitForTimeout(15);
      ok(await cnt('.callout.good') === 1 && await cnt('.fixh') >= 1, where + ' right line shows the fix');
    }
    if (s.type === 'order') {
      await page.click('.chip-btn[data-o="1"]'); await page.waitForTimeout(15);
      ok((await state()).ans[s.id].tries >= 1, where + ' wrong tap is counted');
      for (let k = 0; k < s.itemsN; k++) { await page.click('.chip-btn[data-o="' + k + '"]'); await page.waitForTimeout(10); }
      ok(await cnt('.callout.good') === 1, where + ' correct order completes');
    }
    if (s.type === 'decide') {
      const wrong = [...Array(s.nopts).keys()].find(k => k !== s.pick);
      await page.click('.dopt[data-k="' + wrong + '"]'); await page.waitForTimeout(15);
      ok(await cnt('.verdict .callout.warn') === 1 && await cnt('.verdict .pick') === 1, where + ' other choice shows the Coach pick');
      await page.click('.dopt[data-k="' + s.pick + '"]'); await page.waitForTimeout(15);
      ok(await cnt('.verdict .callout.good') === 1, where + ' picking the Coach pick is confirmed');
    }
    if (s.type === 'incident') {
      const wrong = [...Array(s.nopts).keys()].find(k => k !== s.best);
      await page.click('.opt[data-k="' + wrong + '"]'); await page.waitForTimeout(15);
      ok(await cnt('.callout.bad') >= 1, where + ' wrong first move shows feedback');
      await page.click('.opt[data-k="' + s.best + '"]'); await page.waitForTimeout(15);
      ok(await cnt('.callout.good') === 1, where + ' best first move is confirmed');
      await go(s.id + ':1'); ok(await cnt('.triage li') === s.checks, where + ' lists every triage check');
      await go(s.id + ':2'); ok(await cnt('.notes li') === s.prevent && await cnt('.say') >= 1, where + ' shows the story and prevention');
    }
    if (s.type === 'qa') {
      await page.click('[data-q="timer"]'); await page.waitForTimeout(1200);
      ok(/left|Time/.test(await page.innerText('.timer-out')), where + ' timer runs');
      await go(s.id + ':1');
      if (s.long) { await page.click('[data-q="mode"][data-v="long"]'); await page.waitForTimeout(15); ok(await cnt('.tabs2 .tg.on') === 1, where + ' long answer tab works'); }
      const boxes = await q('[data-pt]'); ok(boxes.length === s.pts, where + ' has a checkbox for every point');
      for (const b of boxes) await b.check();
      ok((await page.innerText('.cnt')).trim() === s.pts + ' of ' + s.pts, where + ' counts every ticked point');
      await go(s.id + ':2');
      const ds = await q('details.fu summary'); for (const d of ds) await d.click();
      ok(ds.length === (s.fu || 0), where + ' lists every follow-up');
    }
    if (s.type === 'challenge') {
      for (let k = 0; k < s.hints; k++) { await page.click('[data-c="hint"]'); await page.waitForTimeout(10); }
      ok(await cnt('.hints .callout') === s.hints, where + ' reveals every hint');
      await page.click('[data-c="sol"]'); await page.waitForTimeout(15);
      ok(await cnt('.solution') === 1, where + ' shows the solution');
      await page.click('[data-c="got"]'); await page.waitForTimeout(15);
      ok((await state()).grades['c:' + s.id] === 2, where + ' saves the self-grade');
    }
    if (s.type === 'sql' || s.type === 'code') {
      for (let i = 0; i < s.n; i++) {
        await go(s.id + ':' + i);
        if (s.steps[i].lines) ok(await cnt('.ln.on') >= 1, where + ' step ' + i + ' highlights lines');
        if (s.type === 'sql' && s.result && s.steps[i].run) {
          await page.click('.btn-run[data-act="run"]'); await page.waitForTimeout(40);
          ok(await cnt('.result tbody tr') === s.resultRows, where + ' Run shows the result table');
        }
      }
    }
    if (s.type === 'term') {
      await page.click('[data-act="skip"]'); await page.waitForTimeout(80);
      ok(await cnt('.term-body .tl') === s.nlines, where + ' prints every terminal line');
      if (s.after) ok(await cnt('.after .callout') === 1, where + ' shows the takeaway');
    }
    if (s.type === 'flow') {
      for (let i = 0; i < s.n; i++) { await go(s.id + ':' + i); ok(await cnt('.graph .edge.on') === s.steps[i].on, where + ' step ' + i + ' lights ' + s.steps[i].on + ' edge(s)'); }
    }
    if (s.type === 'cmp') {
      for (let i = 0; i < s.n; i++) { await go(s.id + ':' + i); ok(await cnt('.tbl.cmp tbody tr') === (s.steps ? s.steps[i].upto : s.rows), where + ' step ' + i + ' reveals the right rows'); }
    }
    if (s.type === 'rows') {
      for (let i = 0; i < s.n; i++) { await go(s.id + ':' + i); ok(await cnt('.layer-tbl') === s.steps[i].tabs, where + ' step ' + i + ' shows its tables'); }
    }
    if (s.type === 'talk') {
      for (let i = 0; i < s.n; i++) { await go(s.id + ':' + i); ok(await cnt('.cards .card') === i + 1, where + ' step ' + i + ' reveals ' + (i + 1) + ' card(s)'); }
    }
    if (s.type === 'cheat') ok(await cnt('.cheat-card') === s.sections, where + ' shows every section');
    if (s.type === 'widget') {
      for (let i = 0; i < s.n; i++) {
        await go(s.id + ':' + i);
        const n = await cnt('#stage-body [data-act]:not([data-act="copy"]):not([data-act="auto"])');
        for (let k = 0; k < n; k++) {
          const els = await q('#stage-body [data-act]:not([data-act="copy"]):not([data-act="auto"])');
          if (!els[k]) break;
          if (await els[k].isEnabled()) { await els[k].click(); await page.waitForTimeout(12); }
        }
        ok(!/undefined|NaN/.test(await text()), where + ' step ' + i + ' survives every button');
      }
    }
    if (s.type === 'mock') {
      await page.click('[data-q="timer"]'); await go(s.id + ':1');
      await page.click('[data-g="3"]'); await page.waitForTimeout(15);
      ok((await state()).grades['m:' + s.qid] === 3, where + ' saves the grade');
    }
    if (s.type === 'recap') {
      ok(await cnt('.badge') === 1, where + ' shows the badge');
      ok(!!(await state()).awarded['recap:' + s.id], where + ' awards XP once');
    }
  }
  // ---------- dbt only: the labs must reproduce what dbt really did ----------
  if (name === 'dbt') {
    const tableRows = sel => page.$$eval(sel + ' tbody tr', rs => rs.map(r => [...r.children].map(td => td.innerText.trim())));
    // snapshot lab: replay the two real runs through the buttons
    const labScene = S.find(x => x.type === 'widget' && x.kind === 'snap');
    await go(labScene.id + ':0');
    await page.click('[data-act="sn-run"]'); await page.waitForTimeout(20);
    let rows = await tableRows('.scd-cols > div:nth-child(2)');
    const real1 = await page.evaluate(() => LAB.real.tables.snap_day1.rows);
    ok(JSON.stringify(rows) === JSON.stringify(real1), 'snapshot lab, run 1, shows the rows dbt wrote');
    await page.click('[data-act="sn-gold"]'); await page.click('[data-act="sn-de"]'); await page.click('[data-act="sn-run"]'); await page.waitForTimeout(20);
    rows = await tableRows('.scd-cols > div:nth-child(2)');
    const real2 = await page.evaluate(() => LAB.real.tables.snap_day2.rows);
    ok(JSON.stringify(rows) === JSON.stringify(real2), 'snapshot lab, run 2, shows the rows dbt wrote');
    // selector lab: the lit nodes are what dbt ls printed
    const selScene = S.find(x => x.type === 'widget' && x.kind === 'sel');
    for (let i = 0; i < 3; i++) {
      await go(selScene.id + ':' + i);
      const chips = await cnt('.sel-chip');
      for (let k = 0; k < chips; k++) {
        const els = await q('.sel-chip'); await els[k].click(); await page.waitForTimeout(15);
        const want = await page.evaluate(() => {
          const names = [...document.querySelectorAll('.sel-out .names span')].map(x => x.textContent);
          const by = {}; LAB.graphs.dag.nodes.forEach(n => { by[n.real] = n.id; });
          return new Set(names.map(n => by[n]).filter(Boolean)).size;
        });
        ok(await cnt('.graph .node.focus') === want, 'selector lab lights the nodes that dbt ls listed (step ' + i + ', chip ' + k + ')');
      }
    }
    // schema lab: the staging schema in the table equals the one in the real log
    const schScene = S.find(x => x.type === 'widget' && x.kind === 'schema');
    await go(schScene.id + ':0');
    for (const t of ['dev', 'prod']) for (const m of ['default', 'override']) {
      await page.click('[data-act="sc-t"][data-v="' + t + '"]'); await page.click('[data-act="sc-m"][data-v="' + m + '"]'); await page.waitForTimeout(15);
      const shown = (await tableRows('.lab .tbl'))[0][2];
      const logLine = await page.innerText('.ev .code-body');
      ok(logLine.indexOf(shown + '.stg_brewline__customers') >= 0, 'schema lab ' + t + ' ' + m + ': the table says ' + shown + ' and the real log agrees');
    }
    // thread lab: the total never grows with more threads
    const thScene = S.find(x => x.type === 'widget' && x.kind === 'threads');
    await go(thScene.id + ':0');
    const totals = [];
    for (const n of [1, 2, 4, 8]) { await page.click('[data-act="th-n"][data-v="' + n + '"]'); await page.waitForTimeout(15); totals.push(+(await page.innerText('.lab-out .big b')).replace(/\D/g, '')); }
    ok(totals.every((x, k) => k === 0 || x <= totals[k - 1]), 'thread lab: more threads never take longer (' + totals.join(', ') + ')');
    // test lab: pick the right check for every problem
    const tlScene = S.find(x => x.type === 'widget' && x.kind === 'testlab');
    await go(tlScene.id + ':0');
    const defs = await page.evaluate(() => LAB.W.testlab.DEF.map(d => [d.id, d.a]));
    for (const [id, ans] of defs) {
      await page.click('[data-act="tl-def"][data-v="' + id + '"]'); await page.waitForTimeout(10);
      await page.click('[data-act="tl-pick"][data-v="' + ans + '"]'); await page.waitForTimeout(15);
      ok(await cnt('.ev .code') === 1, 'test lab shows the real dbt output for ' + id);
    }
    ok(/Solved 9 of 9/.test(await text()), 'test lab counts all nine problems solved');
    // incremental lab: the verdict table says which strategies are right
    const incScene = S.find(x => x.type === 'widget' && x.kind === 'inc');
    await go(incScene.id + ':2');
    ok(await cnt('.tbl tr.new') === 3 && await cnt('.tbl tr.dup') === 2, 'incremental lab: three strategies are correct and two are not');
  }

  // score screen counts every mock question on the path
  await go('mock-score:0');
  ok(await cnt('.ring') === 1 && await cnt('.srow') === S.filter(x => x.type === 'mock').length, 'scorecard lists every boss question');

  // ---------- the app itself ----------
  const firstScene = S.find(x => x.ch === 'm1' && x.type !== 'intro');
  await go(firstScene.id + ':0');
  const k0 = (await state()).frame;
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(40);
  ok((await state()).frame !== k0, 'right arrow moves forward');
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(40);
  ok((await state()).frame === k0, 'left arrow moves back');
  const sc0 = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--scale'));
  await page.click('#fs-up'); const sc1 = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--scale'));
  ok(+sc1 > +sc0, 'A+ makes text bigger'); await page.click('#fs-down'); await page.click('#fs-down');
  ok(+(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--scale'))) < +sc1, 'A- makes text smaller');
  await page.click('#menu-btn'); await page.waitForTimeout(50);
  const numbered = await page.evaluate(() => LAB.chapters.filter(c => c.n).length);
  ok(await cnt('.mrow') === numbered + 1, 'Map lists every mission plus the start');
  const trackBtns = await cnt('.menu-tools .tg'); ok(trackBtns === 3, 'Map offers three paths');
  const framesAll = await page.evaluate(() => document.querySelectorAll('.seg').length);
  await page.click('.menu-tools .tg:first-of-type'); await page.waitForTimeout(80);
  ok((await state()).track === 'junior', 'choosing the Junior path is saved');
  const fJ = await page.evaluate(() => { const m = document.querySelector('#pos').textContent; return m; });
  await page.click('#menu-btn'); await page.click('.menu-tools .tg:last-of-type'); await page.waitForTimeout(80);
  ok((await state()).track === 'all', 'switching back to Everything works');
  // persistence
  const midScene = S.find(x => x.ch === 'm3' && x.n >= 3);
  await go(midScene.id + ':2'); const keyBefore = (await state()).frame; const xpBefore = (await state()).xp;
  await page.reload(); await page.waitForTimeout(400);
  ok((await state()).frame === keyBefore && (await state()).xp === xpBefore, 'progress survives a reload');
  // reset
  await page.click('#menu-btn'); await page.click('[data-m="reset"]'); await page.waitForTimeout(600);
  ok((await state()).xp <= 2, 'Reset clears progress');

  ok(errs.length === 0, 'no console or page errors' + (errs.length ? ': ' + [...new Set(errs)].slice(0, 5).join(' | ') : ''));
  console.log(pass + ' checks passed, ' + fail + ' failed');
  await browser.close(); srv.close();
  process.exit(fail ? 1 : 0);
})();
