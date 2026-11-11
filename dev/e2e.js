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
    await page.click('[data-act="sn-reset"]'); await page.waitForTimeout(15);
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
      const pickBtn = page.locator('[data-act="tl-pick"][data-v="' + ans + '"]');
      if (await pickBtn.isEnabled()) { await pickBtn.click(); await page.waitForTimeout(15); }
      ok(await cnt('.ev .code') === 1, 'test lab shows the real dbt output for ' + id);
    }
    ok(/Solved 9 of 9/.test(await text()), 'test lab counts all nine problems solved');
    // incremental lab: the verdict table says which strategies are right
    const incScene = S.find(x => x.type === 'widget' && x.kind === 'inc');
    await go(incScene.id + ':2');
    ok(await cnt('.tbl tr.new') === 3 && await cnt('.tbl tr.dup') === 2, 'incremental lab: three strategies are correct and two are not');
  }

  // ---------- snowflake-dbt only: the labs must show what was recorded, and the arithmetic must be right ----------
  if (name === 'snowflake-dbt') {
    const norm = s => s.replace(/ /g, ' ').split('\n').map(l => l.trimEnd()).join('\n').trim();
    const blocks = () => page.$$eval('#stage-body .code', bs => bs.map(b => [...b.querySelectorAll('.ln .tx')].map(x => x.textContent).join('\n')));
    const cells = sel => page.$$eval(sel + ' tbody tr', rs => rs.map(r => [...r.children].map(td => td.innerText.trim())));
    const bigs = () => page.$$eval('.lab-out .big b', els => els.map(e => e.textContent));
    // settings lab: every setting shows the statements that were recorded for it
    const cfgScene = S.find(x => x.type === 'widget' && x.kind === 'cfg');
    await go(cfgScene.id + ':0');
    const cfgKeys = await page.$$eval('.sel-chip', els => els.map(e => e.getAttribute('data-v')));
    ok(cfgKeys.length === 10, 'settings lab offers ten settings');
    for (const k of cfgKeys) {
      await page.click('.sel-chip[data-v="' + k + '"]'); await page.waitForTimeout(15);
      const want = await page.evaluate(k => LAB.real.stmts['cfg_' + k].filter(s => s.kind !== 'meta' && s.kind !== 'txn').map(s => s.sql), k);
      ok(JSON.stringify((await blocks()).map(norm)) === JSON.stringify(want.map(norm)), 'settings lab, ' + k + ': the statements shown are the recorded ones');
    }
    await go(cfgScene.id + ':1');
    ok((await cells('.lab .tbl')).length === 10, 'settings lab lists ten settings in the summary');
    // strategies lab: statements are the recorded ones, and the table says which strategies ran in one transaction
    const stScene = S.find(x => x.type === 'widget' && x.kind === 'strat');
    await go(stScene.id + ':0');
    const strat = await page.evaluate(() => LAB.W.stratInfo.list.map(x => [x.k, x.sc]));
    for (const [k, sc] of strat) {
      await page.click('.sel-chip[data-v="' + k + '"]'); await page.waitForTimeout(15);
      const want = await page.evaluate(sc => LAB.W.stratInfo.oneBatch(sc).map(s => s.sql), sc);
      ok(JSON.stringify((await blocks()).map(norm)) === JSON.stringify(want.map(norm)), 'strategies lab, ' + k + ': the statements shown are the recorded ones');
    }
    await go(stScene.id + ':1');
    const srows = await cells('.lab .tbl');
    const expectTxn = { merge: 'yes', di: 'yes', append: 'yes', mb: 'no', cols: 'yes', pred: 'yes' };
    const expectTmp = { merge: 'view', di: 'table', append: 'view', mb: 'view', cols: 'view', pred: 'view' };
    const expectVerbs = { merge: 'merge', di: 'delete, then insert', append: 'insert', mb: 'delete, then insert', cols: 'merge', pred: 'merge' };
    strat.forEach(([k], i) => {
      ok(srows[i][3] === expectTxn[k], 'strategies lab, ' + k + ': one transaction is ' + expectTxn[k] + ' (the table says ' + srows[i][3] + ')');
      ok(srows[i][1] === expectTmp[k], 'strategies lab, ' + k + ': the temporary object is a ' + expectTmp[k]);
      ok(srows[i][2] === expectVerbs[k], 'strategies lab, ' + k + ': statements on the table are ' + expectVerbs[k] + ' (the table says ' + srows[i][2] + ')');
    });
    await go(stScene.id + ':2');
    ok((await cells('.lab .tbl')).length === 6, 'strategies lab: the documentation table lists six strategies');
    // credit calculator: checked against hand arithmetic
    const costScene = S.find(x => x.type === 'widget' && x.kind === 'cost');
    const set = async list => { for (const [a, v] of list) await page.click('[data-act="' + a + '"][data-v="' + v + '"]'); await page.waitForTimeout(15); };
    await go(costScene.id + ':0');
    await set([['c-size', 'S'], ['c-run', '120'], ['c-per', '24'], ['c-price', '3']]);
    let b = await bigs();
    ok(b[0] === '0.067' && b[1] === '1.60' && b[2] === '$144', 'cost lab default: Small, 120 s, 24 runs, $3 gives 0.067, 1.60 and $144 (got ' + b.join(' | ') + ')');
    await set([['c-size', 'L'], ['c-run', '600'], ['c-per', '96'], ['c-price', '4']]);
    b = await bigs();
    ok(b[0] === '1.333' && b[1] === '128.00' && b[2] === '$15,360', 'cost lab: Large, 600 s, 96 runs, $4 gives 1.333, 128.00 and $15,360 (got ' + b.join(' | ') + ')');
    await set([['c-size', 'XS'], ['c-run', '20'], ['c-per', '24'], ['c-price', '3']]);
    b = await bigs();
    ok(b[0] === '0.017', 'cost lab: a 20 second run is billed as 60 seconds (got ' + b[0] + ')');
    await go(costScene.id + ':1');
    await set([['c-eff', '1']]);
    let rows = await cells('.lab .tbl');
    ok(rows.map(r => r[2]).join(',') === '0.53,0.53,0.53,0.53,0.53', 'cost lab: a query that doubles in speed per size costs the same at every size (got ' + rows.map(r => r[2]).join(',') + ')');
    await page.click('[data-act="c-eff"][data-v="0.5"]');
    rows = await cells('.lab .tbl');
    ok(rows.map(r => r[2]).join(',') === '0.53,0.71,0.95,1.26,1.69', 'cost lab: a query that gains 50 percent per size gets dearer (got ' + rows.map(r => r[2]).join(',') + ')');
    await go(costScene.id + ':2');
    await set([['c-size', 'S'], ['c-gap', '300'], ['c-rl', '30']]);
    rows = await cells('.lab .tbl');
    ok(JSON.stringify(rows.map(r => [r[1], r[2], r[3]])) === JSON.stringify([['7.2 hours', '14.4', '$1,296'], ['24.0 hours', '48.0', '$4,322'], ['24.1 hours', '48.2', '$4,337']]), 'cost lab: auto-suspend of 60, 300 and 600 s with a run every 5 minutes (got ' + JSON.stringify(rows) + ')');
    await page.click('[data-act="c-gap"][data-v="3600"]');
    rows = await cells('.lab .tbl');
    ok(JSON.stringify(rows.map(r => r[1])) === JSON.stringify(['0.6 hours', '2.2 hours', '4.2 hours']), 'cost lab: with a run every hour the warehouse is on for 0.6, 2.2 and 4.2 hours (got ' + JSON.stringify(rows.map(r => r[1])) + ')');
    // environment lab: role, warehouse and names come from the recorded connection and statements
    const tgScene = S.find(x => x.type === 'widget' && x.kind === 'targets');
    await go(tgScene.id + ':0');
    for (const [t, role, wh, db, schema, dim] of [
      ['dev', 'TRANSFORMER', 'WH_TRANSFORM_DEV', 'BREWLINE_DEV', 'DEV_ALICE', 'BREWLINE_DEV.DEV_ALICE.dim_customers'],
      ['ci', 'CI_DEPLOYER', 'WH_CI', 'BREWLINE_CI', 'PR_123', 'BREWLINE_CI.PR_123.dim_customers'],
      ['prod', 'TRANSFORMER', 'WH_TRANSFORM', 'BREWLINE', 'ANALYTICS', 'BREWLINE.marts.dim_customers']]) {
      await page.click('[data-act="tg-pick"][data-v="' + t + '"]'); await page.waitForTimeout(15);
      const txt = await text();
      ok([role, wh, db, schema, dim].every(x => txt.includes(x)), 'environment lab, ' + t + ': role, warehouse, database, schema and the full table name match the recording');
    }
    await go(tgScene.id + ':1');
    await set([['ci-pick', 'build']]);
    let code = (await blocks()).map(norm).join('\n');
    ok(code.includes('BREWLINE_CI.PR_123.stg_brewline__customers'), 'environment lab: building the parents reads them from the pull request schema');
    await page.click('[data-act="ci-pick"][data-v="defer"]'); await page.waitForTimeout(15);
    code = (await blocks()).map(norm).join('\n');
    ok(code.includes('BREWLINE.staging.stg_brewline__customers') && !code.includes('PR_123'), 'environment lab: with defer the parents come from production');
  }

  // ---------- aws only: the labs must show what the recording and the documented rules say, and the arithmetic must be right ----------
  // The expected values below were worked out by hand (see aws/verify/check_widgets.js) and are not read from the widgets. The rule for a listing and
  // the shard of a key are applied here to the recorded keys, so a widget that disagrees with the recording fails.
  if (name === 'aws') {
    const bigs = () => page.$$eval('.lab-out .big b', els => els.map(e => e.textContent));
    const spans = () => page.$$eval('.lab-out .big span', els => els.map(e => e.textContent));
    const bigCls = () => page.$$eval('.lab-out .big', els => els.map(e => e.className));
    const tables = () => page.$$eval('.lab .tbl', ts => ts.map(t => [...t.querySelectorAll('tbody tr')].map(r => [...r.children].map(td => td.innerText.trim()))));
    const rowCls = () => page.$$eval('.lab .tbl', ts => ts.map(t => [...t.querySelectorAll('tbody tr')].map(r => r.className)));
    const pick = async (act, v) => { await page.click('[data-act="' + act + '"][data-v="' + v + '"]'); await page.waitForTimeout(15); };
    const chipVals = act => page.$$eval('[data-act="' + act + '"]', els => els.map(e => e.getAttribute('data-v')));
    const scene = kind => S.find(x => x.type === 'widget' && x.kind === kind);
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const counts = k => page.evaluate(k => LAB.real.counts[k], k);
    // the widgets keep their state while the page stays open, and the generic checks above have clicked their chips: start every lab from its default
    const reset = (k, v) => page.evaluate(([k, v]) => { LAB.app.local[k] = v; LAB.app.render(true); }, [k, v]).then(() => page.waitForTimeout(20));

    // S3 listing lab: the documented rule (prefix, then group by the delimiter) applied to the ten recorded keys
    const ls = scene('listing'), KEYS = (await counts('s3.keys')).keys;
    ok(KEYS.length === 10, 'listing lab: the recorded bucket holds ten keys');
    await go(ls.id + ':0'); await reset('ls', { p: 'raw/', d: '/' });
    const prefixes = await chipVals('ls-p');
    ok(prefixes.length === 7, 'listing lab offers seven prefixes');
    for (const p of prefixes) for (const d of ['', '/']) {
      await pick('ls-p', p); await pick('ls-d', d);
      const under = KEYS.filter(k => k.startsWith(p)), cps = new Set(), keys = [];
      for (const k of under) { const rest = k.slice(p.length), i = d ? rest.indexOf(d) : -1; if (i >= 0) cps.add(p + rest.slice(0, i + 1)); else keys.push(k); }
      const b = await bigs();
      ok(same(b, [String(keys.length), String(cps.size), String(keys.length + cps.size)]), 'listing lab, prefix "' + p + '" and delimiter "' + d + '": ' + keys.length + ' keys, ' + cps.size + ' common prefixes (got ' + b.join(' | ') + ')');
    }
    await go(ls.id + ':1');
    ok(same((await tables())[0].map(r => r[1].split(':')[0] + r[2]), ['4true', '4true', '2false']), 'listing lab: ten keys come in pages of 4, 4 and 2, and only the last page is not truncated');

    // versioning lab: a stack of versions and one delete marker. A plain GET works only when the top of the stack is a version.
    const vr = scene('versions');
    const STACK = [1, 2, 3, 2, 1, 0], OKGET = [true, true, false, false, true, false];
    await go(vr.id + ':0'); await reset('vr', { n: 0 });
    for (let n = 0; n < 6; n++) {
      await pick('vr-n', n);
      const boxes = await cnt('.vbox'), cls = (await bigCls())[0], b = (await bigs())[0];
      ok(boxes === STACK[n], 'versioning lab, call ' + (n + 1) + ': ' + STACK[n] + ' entries in the stack (got ' + boxes + ')');
      ok(/good/.test(cls) === OKGET[n] && (OKGET[n] || b === 'NoSuchKey'), 'versioning lab, call ' + (n + 1) + ': a plain GET ' + (OKGET[n] ? 'works' : 'answers NoSuchKey'));
    }
    ok(await cnt('.vbox.marker') === 0, 'versioning lab: after the last call no delete marker is left');
    await pick('vr-n', 2);
    ok(await cnt('.vbox.marker') === 1 && await cnt('.vbox.version') === 2, 'versioning lab, call 3: one delete marker on top of two versions');

    // SigV4 lab: the example of the AWS documentation, and the recorded signature of the emulator run
    const sg = scene('sigv4');
    await go(sg.id + ':0');
    let t = await text();
    ok(t.includes('examplebucket.s3.amazonaws.com') && t.includes('host;range;x-amz-content-sha256;x-amz-date') && t.includes('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'), 'signature lab: the canonical request of the documented example (the SHA-256 of an empty body)');
    await go(sg.id + ':1');
    t = await text();
    ok(t.includes('AWS4-HMAC-SHA256') && t.includes('20130524T000000Z') && t.includes('20130524/us-east-1/s3/aws4_request') && t.includes('7344ae5b7ee6c3e7e6b0fe0640412a37625d1fbfff95c48bbb2dc43964946972'), 'signature lab: the string to sign names the algorithm, the time, the scope and the documented hash of the canonical request');
    ok(t.includes('Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41') && (await bigs())[0] === 'f0e8bdb87c964420...' && same((await bigs()).slice(1), ['yes', 'yes']), 'signature lab: botocore produced the signature that the AWS documentation prints, and a second HMAC chain agrees');
    await go(sg.id + ':2');
    const VAR = await page.evaluate(() => LAB.real.tables['sigv4.variants'].rows.map(r => [r[0], r[2], r[3]]));
    t = (await tables())[0];
    ok(VAR.length === 6 && same(t.map(r => r[2]), ['yes', 'no', 'no', 'no', 'no', 'no']) && new Set(VAR.map(r => r[1])).size === 6, 'signature lab: one changed character, a late clock, another region, a changed header or an extra signed header each give a different signature');
    for (let v = 1; v < 6; v++) {
      await pick('sg-v', v);
      const diff = [...VAR[0][1]].filter((c, k) => c !== VAR[v][1][k]).length;
      ok((await bigs())[1] === diff + ' of 64', 'signature lab, variant ' + v + ': ' + diff + ' of 64 hex characters differ from the documented signature (got ' + (await bigs())[1] + ')');
    }

    // evaluator lab: ten requests answered with the recorded results, then the layers worked out from the AWS evaluation logic
    const ev = scene('evaluator'), TRUTH = (await counts('iam.truth')).rows;
    ok(TRUTH.length === 10 && TRUTH.filter(r => r.result === 'allow').length === 3, 'evaluator lab: ten recorded requests, three of them allowed');
    await go(ev.id + ':0'); await reset('ev', { n: 0, guess: {}, x: { idAllow: true, idDeny: false, resAllow: false, resDeny: false, scp: 'none', bnd: 'none', same: true }, card: '' });
    await pick('ev-n', 0); await pick('ev-g', TRUTH[0].result === 'allow' ? 'deny' : 'allow');
    ok(/The answer was (allow|deny)/.test(await text()), 'evaluator lab: a wrong answer shows what the answer was');
    for (let n = 1; n < 10; n++) { await pick('ev-n', n); await pick('ev-g', TRUTH[n].result); }
    ok(/Answered 10 of 10, right 9\./.test(await text()), 'evaluator lab: nine of ten answers right (the first one was wrong on purpose) (got: ' + ((await text()).match(/Answered[^.]*\./) || [''])[0] + ')');
    await pick('ev-n', 0); await pick('ev-g', TRUTH[0].result);
    ok(/Answered 10 of 10, right 10\./.test(await text()), 'evaluator lab: after correcting the first one, ten of ten');
    await go(ev.id + ':1');
    const verdict = async () => (await page.$$eval('.lab-out .big', els => els.map(e => e.innerText.replace(/\s+/g, ' ').trim())))[0];
    await pick('ev-card', await page.evaluate(() => LAB.W.evaluatorInfo.cards[0].k));
    const cards = await page.evaluate(() => LAB.W.evaluatorInfo.cards.length);
    ok(cards >= 5, 'evaluator lab offers at least five preset situations');
    // by hand: an identity allow alone allows. A deny anywhere wins. An SCP that blocks denies. Across accounts both sides must allow.
    await page.evaluate(() => { LAB.app.local.ev.x = { idAllow: true, idDeny: false, resAllow: false, resDeny: false, scp: 'none', bnd: 'none', same: true }; LAB.app.render(true); });
    await page.waitForTimeout(20);
    ok(/^Allow/.test(await verdict()) && /an allow/.test(await verdict()), 'evaluator lab: an identity allow alone allows in the same account');
    await pick('ev-t', 'idDeny');
    ok(/^Deny/.test(await verdict()) && /explicit deny/.test(await verdict()), 'evaluator lab: an explicit deny wins over the allow');
    await pick('ev-t', 'idDeny'); await pick('ev-scp', 'blocks');
    ok(/^Deny/.test(await verdict()) && /service control policy/.test(await verdict()), 'evaluator lab: a service control policy that blocks denies');
    await pick('ev-scp', 'none'); await pick('ev-same', 0);
    ok(/^Deny/.test(await verdict()) && /implicit deny/.test(await verdict()), 'evaluator lab: across accounts an identity allow alone is not enough');
    await pick('ev-t', 'resAllow');
    ok(/^Allow/.test(await verdict()), 'evaluator lab: across accounts, the identity allow and the bucket policy allow together allow');
    await go(ev.id + ':2');
    ok(same([await cnt('.lab .tbl tbody tr.new'), await cnt('.lab .tbl tbody tr.dup')], [10, 0]), 'evaluator lab: the rule and the emulator agree on all ten requests');

    // Athena scan lab: bytes from the recording, the billing rule worked out by hand (10 MB minimum, rounded up to the next MB, $5 per TB)
    const sc = scene('scan'), SCAN = await counts('athena.scan'), SIZES = await counts('athena.sizes');
    const billed = b => Math.max(1e7, Math.ceil(b / 1e6) * 1e6), cost = (b, k) => billed(b * k) / 1e12 * 5;
    const fmt = x => '$' + (x >= 100 ? Math.round(x).toLocaleString('en-US') : x >= 1 ? x.toFixed(2) : x >= 0.01 ? x.toFixed(3) : x === 0 ? '0' : x.toPrecision(2));
    await go(sc.id + ':0'); await reset('sc', { q: 'q2', l: 'parquet_by_day', scale: 1, cols: ['total_usd', 'order_date'] });
    for (const qq of SCAN.queries) for (const lay of SCAN.layouts) {
      await pick('sc-q', qq.id); await pick('sc-l', lay.k);
      const b = await bigs(), want = fmt(cost(qq.bytes[lay.k], 1));
      ok(b[2] === want, 'scan lab, ' + qq.id + ' on ' + lay.k + ': one run costs ' + want + ' (got ' + b[2] + ')');
    }
    await pick('sc-q', 'q5'); await pick('sc-l', 'csv');
    ok(same((await bigs()).slice(0, 2), ['166.7 MB', '167 MB']) && (await bigs())[3] === '517x', 'scan lab: the status count reads 166.7 MB of CSV, billed 167 MB, and is 517 times the cheapest layout (322,658 bytes of Parquet)');
    await pick('sc-q', 'q2'); await pick('sc-l', 'parquet_by_day');
    ok(same((await bigs()).slice(1, 3), ['10 MB', '$0.000050']) && /minimum/.test((await page.$$eval('.lab-out .big span', e => e.map(x => x.textContent)))[1]), 'scan lab: 21 KB is billed as the 10 MB minimum, $0.00005');
    await go(sc.id + ':1');
    await pick('sc-x', 1000);
    t = (await tables())[0];
    ok(t.length === 5 && t[1][5].startsWith('21.4 MB') && t[1][5].includes('$0.00011'), 'scan lab, 1,000 times the data: q2 on Parquet day folders is 21.4 MB, billed 22 MB, $0.00011 (got ' + (t[1] && t[1][5]) + ')');
    ok(t[0][1].includes('166.66 GB') && t[0][1].includes('$0.833'), 'scan lab, 1,000 times the data: q1 on the single CSV is 166.66 GB and $0.833 (got ' + (t[0] && t[0][1]) + ')');
    await go(sc.id + ':2');
    await pick('sc-all', 'all');
    const sb = await bigs();
    ok(sb[0] === '11 of 11' && sb[2] === '100.0 %', 'scan lab: SELECT * reads all 11 columns, 100 % of the bytes (got ' + sb.join(' | ') + ')');
    const bytesSel = (await page.evaluate(() => { const pc = LAB.real.counts['athena.parquet_columns'].bytes_by_column; return Object.keys(pc).reduce((a, k) => a + pc[k], 0) + LAB.real.counts['athena.sizes'].parquet_footer_bytes; }));
    ok(sb[1] === (bytesSel / 1e6).toFixed(1) + ' MB', 'scan lab: the bytes of all columns plus the footer add up to ' + (bytesSel / 1e6).toFixed(1) + ' MB (got ' + sb[1] + ')');

    // Kinesis lab: the hash picks the shard. The recorded mapping is applied to every key.
    const kn = scene('kinesis'), MAP = (await counts('kinesis.mapping')).rows, SH = (await counts('kinesis.shards')).shards.map(s => s.id);
    await go(kn.id + ':0'); await reset('kn', { key: 'C-0001', salt: false });
    ok(same(await chipVals('kn-k'), MAP.map(r => r.key)), 'Kinesis lab offers the twelve recorded keys');
    for (const r of MAP) {
      await pick('kn-k', r.key);
      const b = await bigs();
      ok(b[0] === r.key && b[1] === r.md5.slice(0, 12) + '...' && b[3] === 'shard ' + SH.indexOf(r.shard), 'Kinesis lab, key ' + r.key + ': MD5 ' + r.md5.slice(0, 12) + ' and shard ' + SH.indexOf(r.shard) + ' (got ' + b.join(' | ') + ')');
    }
    ok(MAP.slice(0, 5).every(r => r.shard === SH[2]), 'Kinesis recording: the first five customers all land on shard 2');
    await go(kn.id + ':1');
    ok(same((await bigs()).slice(0, 2), ['1.88x', 'C-0001']), 'Kinesis lab: by key the busiest shard is 1.88 times the average and C-0001 is the busiest customer');
    const lanes0 = await page.$$eval('.gantt .lane-v', xs => xs.map(x => +x.textContent.replace(/,/g, '')));
    ok(lanes0.length === 4 && lanes0.reduce((a, b) => a + b, 0) === 20000 && Math.max(...lanes0) === 9390 && Math.min(...lanes0) === 2743, 'Kinesis lab: 20,000 events over four shards, 9,390 on the busiest and 2,743 on the quietest');
    await pick('kn-s', 1);
    const lanes1 = await page.$$eval('.gantt .lane-v', xs => xs.map(x => +x.textContent.replace(/,/g, '')));
    ok((await bigs())[0] === '1.09x' && lanes1.reduce((a, b) => a + b, 0) === 20000 && Math.max(...lanes1) / 5000 < 1.1, 'Kinesis lab: with a salt of 8 the busiest shard is 1.09 times the average');
    await go(kn.id + ':2');
    t = (await tables()); const rc = await rowCls();
    ok(t[0].length === 4 && t[1].length === 6 && t[1].filter(r => r[2] === 'closed').length === 1 && t[1].filter(r => r[3] === '12.5 %').length === 2 && rc[1].filter(c => c === 'new').length === 2, 'Kinesis lab: a split turns four shards into six: one closed, two new with 12.5 % of the range each');

    // SQS lab: the timeline of one message, then FIFO and SNS
    const sq = scene('sqs');
    await go(sq.id + ':0'); await reset('sq', { n: 0 });
    ok(await cnt('[data-act="sq-n"]') === 4, 'SQS lab: four moments on the timeline');
    for (let n = 0; n < 4; n++) {
      await pick('sq-n', n);
      const b = await bigs();
      ok(b[2] === (n === 3 ? 'in the DLQ' : 'in the main queue'), 'SQS lab, moment ' + (n + 1) + ': the message is ' + (n === 3 ? 'in the DLQ' : 'in the main queue'));
    }
    await go(sq.id + ':1');
    t = (await tables())[0];
    ok(t.length === 3 && /Delivered 2 messages in order: order 1, order 2/.test(t[0][2]) && /Received 2 messages/.test(t[1][2]) && /Received 1 message/.test(t[2][2]), 'SQS lab: FIFO delivered two messages in order, the unfiltered subscriber got 2 and the filtered one got 1');

    // retry lab: 30 s x 2^(n-1). The totals are sums worked out by hand.
    const rt = scene('retry');
    await go(rt.id + ':0'); await reset('rt', { interval: 30, rate: 2, attempts: 5, maxDelay: 0, jitter: 'NONE' });
    t = (await tables())[0];
    ok(same(t.map(r => [r[1], r[2]]), [['30 s', '30 s'], ['60 s', '90 s'], ['2.0 min', '3.5 min'], ['4.0 min', '7.5 min'], ['8.0 min', '15.5 min']]) && (await bigs())[0] === '15.5 min', 'retry lab: 30, 60, 120, 240 and 480 seconds, 930 in all (15.5 minutes)');
    for (const [i0, r0, a0, m0, tot] of [[5, 2, 3, 0, '35 s'], [60, 1, 8, 0, '8.0 min'], [30, 3, 8, 300, '31.5 min'], [5, 3, 5, 0, '10.1 min']]) {
      await pick('rt-i', i0); await pick('rt-r', r0); await pick('rt-a', a0); await pick('rt-m', m0);
      ok((await bigs())[0] === tot, 'retry lab: interval ' + i0 + ', rate ' + r0 + ', ' + a0 + ' attempts, cap ' + m0 + ' gives ' + tot + ' (got ' + (await bigs())[0] + ')');
    }
    await pick('rt-j', 'FULL');
    ok(/longest total wait/.test(await text()) && /a random time from 0 to/.test(await text()), 'retry lab: full jitter shows a random wait up to the same maximum');
    await go(rt.id + ':1');
    t = (await tables())[0];
    ok(same(t.map(r => r[2]), ['yes', 'no', 'no', 'yes']), 'retry lab: only the 30 s rate-2 schedule and the capped one cover a slot that takes 10 minutes to free');

    // bill lab: the arithmetic of the example rates, worked out by hand in aws/verify/check_widgets.js
    const bl = scene('bill');
    await go(bl.id + ':0'); await reset('bl', { p: 'today', lv: {} });
    t = (await tables())[0];
    ok(same(t.map(r => r[2]), ['$46.00', '$45.00', '$100', '$264', '$77.20', '$5.60', '$55.35', '$375', '$50.00']) && (await bigs())[0] === '$1,018', 'bill lab: the nine lines add up to $1,018.15');
    ok((await bigs())[1] === 'Redshift Serverless' && /37 percent/.test((await spans())[1]), 'bill lab: Redshift Serverless is the biggest line, 37 percent');
    await go(bl.id + ':1');
    const levers = await chipVals('bl-l');
    ok(same(levers, ['parquet', 'life', 'gateway', 'flex', 'arm']), 'bill lab offers five savings');
    const SAVED = { parquet: 90, life: 14.7, gateway: 18, flex: 45, arm: 1 };
    for (const k of levers) {
      await pick('bl-l', k);
      const b = (await bigs());
      ok(b[1] === '$' + Math.round(1018.15 - SAVED[k]).toLocaleString('en-US'), 'bill lab, saving "' + k + '": the bill falls by $' + SAVED[k] + ' (got ' + b[1] + ')');
      await pick('bl-l', k);
    }
    for (const k of levers) await pick('bl-l', k);
    ok((await bigs())[1] === '$849' && (await bigs())[2] === '17 %', 'bill lab: all five savings together leave $849.45, which saves 17 percent (got ' + (await bigs()).join(' | ') + ')');
    for (const k of levers) await pick('bl-l', k);

    // distribution lab: a model with made-up numbers, worked out by hand in aws/verify/check_widgets.js
    const dk = scene('distkey');
    await go(dk.id + ':0'); await reset('dk', { style: 'key_customer', o: 'even', cs: 'even', cn: 400, sort: 'none', q: 'day' });
    const DIST = { even: '1.00x', key_customer: '1.90x', key_order: '1.00x' };
    for (const k of Object.keys(DIST)) { await pick('dk-s', k); ok((await bigs())[0] === DIST[k], 'distribution lab, ' + k + ': the busiest slice is ' + DIST[k] + ' the average (got ' + (await bigs())[0] + ')'); }
    await pick('dk-s', 'key_customer');
    ok(await cnt('.gbar.bad') === 1 && (await bigs())[1] === '23.8 %', 'distribution lab: with KEY on the customer one slice is marked busy and holds 23.8 % of the table');
    await pick('dk-s', 'all');
    ok((await bigs())[0] === '4x' && await cnt('.gantt .lane') === 4, 'distribution lab: ALL stores a full copy on each of the four nodes');
    await go(dk.id + ':1');
    const PLAN = {
      400: { even: { even: ['DS_BCAST_INNER', '1,600'], key_customer: ['DS_BCAST_INNER', '1,600'], all: ['DS_DIST_ALL_NONE', '0'] }, key_customer: { even: ['DS_DIST_INNER', '400'], key_customer: ['DS_DIST_NONE', '0'], all: ['DS_DIST_ALL_NONE', '0'] }, key_order: { even: ['DS_BCAST_INNER', '1,600'], key_customer: ['DS_BCAST_INNER', '1,600'], all: ['DS_DIST_ALL_NONE', '0'] } },
      40000: { even: { even: ['DS_DIST_BOTH', '47,994'], key_customer: ['DS_DIST_OUTER', '7,994'], all: ['DS_DIST_ALL_NONE', '0'] }, key_customer: { even: ['DS_DIST_INNER', '40,000'], key_customer: ['DS_DIST_NONE', '0'], all: ['DS_DIST_ALL_NONE', '0'] }, key_order: { even: ['DS_DIST_BOTH', '47,994'], key_customer: ['DS_DIST_OUTER', '7,994'], all: ['DS_DIST_ALL_NONE', '0'] } }
    };
    for (const n of Object.keys(PLAN)) for (const o of Object.keys(PLAN[n])) for (const c of Object.keys(PLAN[n][o])) {
      await pick('dk-n', n); await pick('dk-o', o); await pick('dk-c', c);
      ok(same(await bigs(), PLAN[n][o][c]), 'distribution lab, orders ' + o + ' with ' + n + ' customers ' + c + ': ' + PLAN[n][o][c].join(', ') + ' (got ' + (await bigs()).join(', ') + ')');
    }
    await go(dk.id + ':2');
    for (const [sort, q, want] of [['order_date', 'day', '2 of 100'], ['order_date', 'month', '35 of 100'], ['customer_id', 'customer', '1 of 100'], ['none', 'day', '100 of 100'], ['customer_id', 'day', '100 of 100']]) {
      await pick('dk-k', sort); await pick('dk-q', q);
      ok((await bigs())[0] === want && await cnt('.zmap i.on') === +want.split(' ')[0], 'distribution lab, sort key ' + sort + ', ' + q + ': ' + want + ' blocks, and the grid agrees');
    }

    // EventBridge pattern lab: 36 recorded answers, and the matched rows are highlighted
    const pt = scene('patterns'), PAT = await counts('events.patterns');
    await go(pt.id + ':0'); await reset('pt', { p: 'p1' });
    ok(same(await chipVals('pt-p'), PAT.patterns.map(p => p.id)), 'pattern lab offers the six recorded patterns');
    const WANT = { p1: ['e1', 'e6'], p2: ['e4'], p3: ['e1', 'e2', 'e4', 'e5', 'e6'], p4: ['e1', 'e2', 'e5'], p5: ['e4'], p6: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'] };
    for (const id of Object.keys(WANT)) {
      await pick('pt-p', id);
      t = (await tables())[0]; const hit = t.filter(r => r[5] === 'match').map(r => r[0]);
      ok(same(hit, WANT[id]) && (await bigs())[0] === WANT[id].length + ' of 6' && (await rowCls())[0].filter(c => c === 'new').length === WANT[id].length, 'pattern lab, ' + id + ': matches ' + WANT[id].join(', ') + ' (got ' + hit.join(', ') + ')');
    }
  }

  // ---------- azure only: the labs must show what the Azure SDK, Azurite, DuckDB and pyarrow recorded, and the rules must be right ----------
  // The expected values below were worked out by hand (see azure/verify/check_widgets.js) or derived from the recording here. They are not read from the widgets.
  if (name === 'azure') {
    const bigs = () => page.$$eval('.lab-out .big b', els => els.map(e => e.textContent));
    const spans = () => page.$$eval('.lab-out .big span', els => els.map(e => e.textContent));
    const bigCls = () => page.$$eval('.lab-out .big', els => els.map(e => e.className));
    const tables = () => page.$$eval('.lab .tbl', ts => ts.map(t => [...t.querySelectorAll('tbody tr')].map(r => [...r.children].map(td => td.innerText.trim()))));
    const rowCls = () => page.$$eval('.lab .tbl', ts => ts.map(t => [...t.querySelectorAll('tbody tr')].map(r => r.className)));
    const pick = async (act, v) => { await page.click('[data-act="' + act + '"][data-v="' + v + '"]'); await page.waitForTimeout(15); };
    const chipVals = act => page.$$eval('[data-act="' + act + '"]', els => els.map(e => e.getAttribute('data-v')));
    const scene = kind => S.find(x => x.type === 'widget' && x.kind === kind);
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const counts = k => page.evaluate(k => LAB.real.counts[k], k);
    const n0 = x => x.toLocaleString('en-US');
    const usd = x => '$' + (x >= 100 ? n0(Math.round(x)) : x >= 1 ? x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : x >= 0.01 ? x.toFixed(3) : x === 0 ? '0' : x.toPrecision(2));
    // the widgets keep their state while the page stays open, and the generic checks above have clicked their chips: start every lab from its default
    const reset = (k, v) => page.evaluate(([k, v]) => { LAB.app.local[k] = v; LAB.app.render(true); }, [k, v === undefined ? null : v]).then(() => page.waitForTimeout(20));
    let t;

    // blob listing lab: the documented rule (prefix, then group by the delimiter) applied to the ten recorded blob names
    const ls = scene('listing'), KEYS = (await counts('blob.keys')).keys.map(k => k.name);
    ok(KEYS.length === 10, 'listing lab: the recorded container holds ten blobs');
    await go(ls.id + ':0'); await reset('ls', { p: 'orders/', d: '/' });
    const prefixes = await chipVals('ls-p');
    ok(prefixes.length === 6, 'listing lab offers six prefixes');
    for (const p of prefixes) for (const d of ['', '/']) {
      await pick('ls-p', p); await pick('ls-d', d);
      const under = KEYS.filter(k => k.startsWith(p)), cps = new Set(), keys = [];
      for (const k of under) { const rest = k.slice(p.length), i = d ? rest.indexOf(d) : -1; if (i >= 0) cps.add(p + rest.slice(0, i + 1)); else keys.push(k); }
      const b = await bigs();
      ok(same(b, [String(keys.length), String(cps.size), String(keys.length + cps.size)]), 'listing lab, prefix "' + p + '" and delimiter "' + d + '": ' + keys.length + ' blobs, ' + cps.size + ' blob prefixes (got ' + b.join(' | ') + ')');
      const cpShown = await page.$$eval('.keylist li.cp', xs => xs.map(x => x.textContent).sort());
      const kShown = await page.$$eval('.keylist li:not(.cp)', xs => xs.map(x => x.textContent).sort());
      ok(same(cpShown, [...cps].sort()) && same(kShown, keys.slice().sort()), 'listing lab, prefix "' + p + '" and delimiter "' + d + '": the lists on the page are the blobs and the blob prefixes');
    }
    await go(ls.id + ':1');
    t = (await tables())[0];
    ok(same(t.map(r => r[1].split(':')[0]), ['4', '4', '2']) && same(t.map(r => r[2].startsWith('yes')), [true, true, false]), 'listing lab: ten blobs come in pages of 4, 4 and 2, and only the last page has no marker');

    // SAS lab: the seven fields, then 25 recorded answers. Allowed is the recorded status below 300.
    const sa = scene('sas'), SF = await counts('sas.fields'), MX = await counts('sas.matrix');
    await go(sa.id + ':0'); await reset('sa', { f: 'sp', c: 0, o: 0, guess: {} });
    ok(same(await chipVals('sa-f'), ['st', 'se', 'sp', 'spr', 'sv', 'sr', 'sig']), 'SAS lab: the seven fields in the order that the signature covers them');
    for (const f of SF.order) {
      await pick('sa-f', f);
      const v = SF.fields[f], head = await page.innerText('.lab .callout.tip b');
      ok(head.startsWith(f + ' = ' + (v.length > 28 ? v.slice(0, 28) + '...' : v) + ', '), 'SAS lab, field ' + f + ': the explanation names the recorded value (got ' + head + ')');
    }
    await go(sa.id + ':1');
    let allowedN = 0;
    for (let c = 0; c < 5; c++) for (let o = 0; o < 5; o++) {
      await pick('sa-c', c); await pick('sa-o', o); await pick('sa-g', 'allow');
      const r = MX.cases[c].results[o], good = r.status < 300; if (good) allowedN++;
      const fb = await page.innerText('.lab .callout.good, .lab .callout.warn');
      ok(fb.startsWith(good ? 'Right.' : 'The answer was deny.') && fb.includes('HTTP ' + r.status) && (!r.code || fb.includes(r.code)), 'SAS lab, ' + MX.cases[c].sas + ' / ' + MX.ops[o] + ': ' + (good ? 'allowed' : 'denied') + ' with HTTP ' + r.status + (r.code ? ' ' + r.code : ''));
      ok(await cnt('.lab .callout.good') === (good ? 1 : 0) && await cnt('.lab .callout.warn') === (good ? 0 : 1), 'SAS lab, ' + MX.cases[c].sas + ' / ' + MX.ops[o] + ': the answer allow is marked ' + (good ? 'right' : 'wrong'));
    }
    ok(allowedN === 6 && /Answered 25 of 25, right 6\./.test(await text()), 'SAS lab: six of the 25 requests are allowed, so answering allow every time is right six times (got ' + ((await text()).match(/Answered[^.]*\./) || [''])[0] + ')');
    for (let c = 0; c < 5; c++) for (let o = 0; o < 5; o++) { await pick('sa-c', c); await pick('sa-o', o); await pick('sa-g', 'deny'); }
    ok(/Answered 25 of 25, right 19\./.test(await text()), 'SAS lab: changing every answer to deny is right 19 times');
    await go(sa.id + ':2');
    ok(same([await cnt('.tbl td.wgood'), await cnt('.tbl td.wbad'), await cnt('.tbl tbody tr')], [6, 19, 5]), 'SAS lab: the table shows five tokens, six allowed answers and 19 refused ones');
    t = (await tables())[0];
    ok(t[3].slice(1).every(c => /^403 Auth\.\.\.Failure$/.test(c)) && t[4].slice(1).every(c => /^403 Auth\.\.\.Failure$/.test(c)), 'SAS lab: the expired token and the edited token are refused everywhere with 403');

    // access lab: ten requests, then the order of the rules worked out by hand
    const ac = scene('access'), WANT = [false, false, true, false, true, false, false, true, false, true];
    await go(ac.id + ':0'); await reset('ac', null);
    ok(await cnt('[data-act="ac-n"]') === 10, 'access lab: ten requests');
    await pick('ac-n', 0); await pick('ac-g', 'allow');
    ok(/The answer was deny\./.test(await text()) && /Decided by/.test(await text()) && await cnt('.lab .callout.warn') === 1 && await cnt('.lab .callout.good') === 0, 'access lab: a wrong answer shows what the answer was and which rule decided, and is marked wrong');
    for (let n = 0; n < 10; n++) { await pick('ac-n', n); await pick('ac-g', WANT[n] ? 'allow' : 'deny'); if (n > 0) ok(await cnt('.lab .callout.good') === 1 && await cnt('.lab .callout.warn') === 0, 'access lab, request ' + (n + 1) + ': the right answer is marked right'); }
    ok(/Answered 10 of 10, right 10\./.test(await text()), 'access lab: all ten requests answered right with the documented order (got ' + ((await text()).match(/Answered[^.]*\./) || [''])[0] + ')');
    await go(ac.id + ':1');
    const verdict = async () => ({ v: (await bigs())[0], by: ((await spans())[0] || '').replace('decided by: ', '') });
    for (let k = 1; k <= 10; k++) { await pick('ac-card', k); ok((await verdict()).v === (WANT[k - 1] ? 'Allow' : 'Deny'), 'access lab, request ' + k + ': the rule says ' + (WANT[k - 1] ? 'allow' : 'deny')); }
    await pick('ac-card', 3);
    ok(same(await verdict(), { v: 'Allow', by: 'a role assignment' }), 'access lab: Storage Blob Data Reader on the container allows a read through a role assignment');
    await pick('ac-op', 'write');
    ok((await verdict()).v === 'Deny', 'access lab: the reader role holds no write action, and there is no ACL, so a write is refused');
    await pick('ac-op', 'read'); await pick('ac-net', 'blocked');
    ok(same(await verdict(), { v: 'Deny', by: 'network rules' }), 'access lab: a refused network ends the check before any identity');
    await pick('ac-net', 'allowed'); await pick('ac-auth', 'key'); await pick('ac-key', 0);
    ok(same(await verdict(), { v: 'Deny', by: 'Shared Key switched off' }), 'access lab: the account key is refused when Shared Key access is off');
    await pick('ac-key', 1);
    ok(same(await verdict(), { v: 'Allow', by: 'the account key' }), 'access lab: the account key is full access, and it skips roles and ACLs');
    await pick('ac-auth', 'sas'); await pick('ac-sas', 0);
    ok(same(await verdict(), { v: 'Deny', by: 'the SAS permissions' }), 'access lab: a SAS without the permission is refused');
    await pick('ac-sas', 1);
    ok(same(await verdict(), { v: 'Allow', by: 'the SAS' }), 'access lab: a SAS with the permission is allowed, with no role');
    await pick('ac-auth', 'entra'); await pick('ac-role', 'owner');
    ok((await verdict()).v === 'Deny', 'access lab: Owner holds no data action, so an Entra read is refused');
    await pick('ac-role', 'none'); await pick('ac-acl', 'r'); await pick('ac-px', 1);
    ok(same(await verdict(), { v: 'Allow', by: 'the ACL' }), 'access lab: with no role, r-- on the file and execute on every folder above allows a read');
    await pick('ac-op', 'write');
    ok((await verdict()).v === 'Deny', 'access lab: r-- does not allow a write');
    await pick('ac-acl', 'rw');
    ok((await verdict()).v === 'Allow', 'access lab: rw- allows a write');
    await pick('ac-px', 0);
    ok((await verdict()).v === 'Deny', 'access lab: one folder above the file without execute refuses it');
    await go(ac.id + ':2');
    t = (await tables())[0]; const rc = (await rowCls())[0];
    ok(t.length === 10 && same(t.map(r => r[2]), WANT.map(w => w ? 'allow' : 'deny')) && rc.filter(c => c === 'new').length === 4 && same([t[2][3], t[4][3], t[7][3], t[9][3]], ['a role assignment', 'the ACL', 'the SAS', 'a role assignment']), 'access lab: the table gives the ten answers, and names the deciding rule of the four allowed requests');

    // role scope lab: the tree below a scope, and what a role means on each resource type
    const sc = scene('scopes');
    await go(sc.id + ':0'); await reset('sp', { scope: 'rgd', role: 'blobreader' });
    // [scope, role, items below the scope, tags marked yes, tags marked no]
    for (const [scope, role, below, y, n] of [['sp', 'blobreader', 8, 3, 9], ['sa', 'blobcontrib', 2, 3, 3], ['craw', 'blobreader', 0, 1, 1], ['mg', 'owner', 13, 8, 8], ['kv', 'kvsecrets', 0, 1, 1], ['sp', 'kvsecrets', 8, 1, 11], ['sp', 'adfcontrib', 8, 1, 11], ['sd', 'contributor', 3, 2, 2], ['sd', 'blobreader', 3, 2, 2], ['rgn', 'blobreader', 1, 0, 2]]) {
      await pick('sc-r', role); await pick('sc-n', scope);
      const msg = await page.innerText('.lab .callout.tip');
      ok(new RegExp('reaches the ' + below + ' items below it').test(msg) && await cnt('.tn.pick') === 1 && await cnt('.tn.in') === below, 'scope lab, ' + role + ' at ' + scope + ': ' + below + ' items below it are inherited (got: ' + (msg.match(/reaches the \d+/) || [''])[0] + ')');
      ok(await cnt('.tn .tag.y') === y && await cnt('.tn .tag.n') === n, 'scope lab, ' + role + ' at ' + scope + ': ' + y + ' tags are yes and ' + n + ' are no (got ' + await cnt('.tn .tag.y') + ' and ' + await cnt('.tn .tag.n') + ')');
    }
    await go(sc.id + ':1');
    ok(await cnt('.tbl tbody tr') === 7 && await cnt('.tbl td.wbad') === 4 && await cnt('.tbl td.wgood') === 3, 'scope lab: seven roles, and four of them touch no data');

    // credential chain lab: the recorded error, then the first condition that holds
    const cc = scene('credchain');
    await go(cc.id + ':0');
    ok(await cnt('.chain li') === 9, 'credential lab: the recorded chain has nine credentials');
    await go(cc.id + ':1'); await reset('cc', null);
    const usedNow = async () => ({ used: (await page.$$eval('.chain li.used b', xs => xs.map(x => x.textContent)))[0] || null, skipped: await cnt('.chain li.skip'), bad: await cnt('.callout.bad') });
    const PRE = { 'my laptop, after az login': ['AzureCliCredential', 2], 'a function app with a managed identity': ['ManagedIdentityCredential', 5], 'a CI job with a client secret in its variables': ['EnvironmentCredential', 7], 'a Kubernetes pod with workload identity': ['WorkloadIdentityCredential', 6] };
    for (const [pre, [cred, skipped]] of Object.entries(PRE)) { await pick('cc-p', pre); ok(same(await usedNow(), { used: cred, skipped, bad: 0 }), 'credential lab, "' + pre + '": ' + cred + ' signs in and ' + skipped + ' credentials are never asked'); }
    await pick('cc-p', 'a container with no identity at all');
    ok(same(await usedNow(), { used: null, skipped: 0, bad: 1 }), 'credential lab: with nothing set no credential signs in');
    await pick('cc-t', 'cli'); await pick('cc-t', 'mi');
    ok((await usedNow()).used === 'ManagedIdentityCredential', 'credential lab: a managed identity beats the CLI credential because it comes first');
    await pick('cc-t', 'env');
    ok((await usedNow()).used === 'EnvironmentCredential', 'credential lab: environment variables beat both');
    await pick('cc-t', 'env'); await pick('cc-t', 'mi'); await pick('cc-t', 'cli');
    ok((await usedNow()).used === null, 'credential lab: switching everything off leaves no credential');

    // Data Factory expression lab: the model evaluated by hand for three trigger times
    const ex = scene('adfexpr');
    await go(ex.id + ':0'); await reset('ex', null);
    ok(await page.evaluate(() => LAB.W.exprInfo.examples.length) === 17, 'expression lab: 17 examples');
    const result = async () => ({ text: (await page.innerText('.expr.res, .expr.err')).trim(), err: await cnt('.expr.err') === 1 });
    const EXP0 = ['raw/orders/dt=2026-03-14', '2026/03/14', '2026-03-13', '2026-00-14', '2026-03-14T06:00:00.0000000Z', 'MERGE', "SELECT * FROM dbo.orders WHERE modified_at > '2026-03-13T06:00:00Z'", "SELECT * FROM dbo.orders WHERE modified_at > '2026-03-13T06:00:00Z'", '2026-03', 's_07', '3', 'orders', '4', null, '@{pipeline().Pipeline}', 'pipeline().parameters.run_date', null];
    await pick('ex-t', 0);
    for (let k = 0; k < 17; k++) {
      await pick('ex-e', k); const r = await result();
      if (EXP0[k] === null) ok(r.err, 'expression lab, example ' + (k + 1) + ': the model reports an error');
      else ok(!r.err && r.text === EXP0[k], 'expression lab, example ' + (k + 1) + ' at the first trigger time: ' + EXP0[k] + ' (got ' + r.text + ')');
    }
    await pick('ex-e', 13);
    ok(/does not exist/.test((await result()).text), 'expression lab: a missing parameter fails before coalesce can help');
    await pick('ex-e', 16);
    ok(/\)/.test((await result()).text), 'expression lab: a missing bracket is reported');
    for (const [k, tt, want] of [[2, 1, '2026-03-30'], [2, 2, '2025-12-31'], [3, 1, '2026-30-31'], [3, 2, '2026-15-01'], [1, 1, '2026/03/31'], [1, 2, '2026/01/01'], [4, 2, '2026-01-01T00:15:00.0000000Z']]) {
      await pick('ex-e', k); await pick('ex-t', tt);
      ok((await result()).text === want, 'expression lab, example ' + (k + 1) + ' at trigger time ' + (tt + 1) + ': ' + want);
    }
    await go(ex.id + ':1');
    t = (await tables())[0];
    ok(t.length === 6 && (await rowCls())[0].filter(c => c === 'dup').length === 3 && t[0][1] === '2026-00-14', 'expression lab: six lessons, and three of them are results that look wrong or fail');

    // watermark lab: three strategies replayed from the recorded orders and run times
    const wm = scene('watermark'), WM = await counts('adf.watermark'), ts = z => Date.parse(z.replace(' ', 'T') + 'Z');
    const SRC = WM.source.map(o => ({ id: o.order_id, mod: ts(o.modified_at), com: ts(o.committed_at) })), RUNS = WM.runs.map(ts);
    const replay = strategy => {
      let w = -Infinity; const reads = [], seen = new Set();
      for (const T of RUNS) {
        const vis = SRC.filter(o => o.com <= T);
        const rows = strategy === 'A' ? vis.filter(o => o.mod > w) : strategy === 'B' ? vis.filter(o => o.mod > w && o.mod <= T) : vis.filter(o => o.mod >= w - 15 * 60000 && o.mod <= T);
        reads.push(rows.map(o => o.id).sort()); rows.forEach(o => seen.add(o.id));
        if (strategy === 'A') { if (rows.length) w = Math.max(...rows.map(o => o.mod)); } else w = T;
      }
      return { reads, missing: SRC.map(o => o.id).filter(i => !seen.has(i)) };
    };
    await go(wm.id + ':0'); await reset('wm', { s: 'B', r: 3 });
    for (const k of ['A', 'B', 'C']) {
      const rp = replay(k);
      for (let r = 1; r <= 3; r++) {
        await pick('wm-s', k); await pick('wm-r', r);
        const b = await bigs();
        ok(same(b[0].split(', ').sort(), rp.reads[r - 1]), 'watermark lab, strategy ' + k + ', run ' + r + ': reads ' + rp.reads[r - 1].join(', ') + ' (got ' + b[0] + ')');
        ok(b[2] === (r < 3 ? 'run 3 shows it' : (rp.missing.length ? rp.missing.join(', ') : 'none')), 'watermark lab, strategy ' + k + ', run ' + r + ': the missing rows are ' + (r < 3 ? 'shown after run 3' : rp.missing.join(', ') || 'none') + ' (got ' + b[2] + ')');
      }
      ok(await cnt('.tbl tbody tr.dup') === rp.missing.length, 'watermark lab, strategy ' + k + ': ' + rp.missing.length + ' rows are marked as never read');
    }
    await go(wm.id + ':1');
    t = (await tables())[0];
    ok(same(t.map(r => r[2]), ['5', '4', '9']) && same(t.map(r => r[3]), ['O5', 'O3, O5', 'none']), 'watermark lab: A reads five rows and loses O5, B reads four and loses O3 and O5, C reads nine rows for six orders and loses none');

    // wildcard lab: the files that each pattern opens, and the example bill for one run
    const pr = scene('prune'), PC = (await counts('synapse.prune')).cases;
    await go(pr.id + ':0'); await reset('pr', null);
    const FILES = { p1: 60, p2: 14, p3: 14, p4: 3, p5: 1, p6: 14, p7: 14, p8: 1 };
    ok(same(await chipVals('pr-c'), Object.keys(FILES)), 'wildcard lab offers the eight recorded queries');
    for (const [id, n] of Object.entries(FILES)) {
      await pick('pr-c', id);
      const tiles = id === 'p8' ? 1 : 60, b = await bigs();
      ok(b[0] === n + ' of ' + tiles && await cnt('.skf.read') === n && await cnt('.skf') === tiles, 'wildcard lab, ' + id + ': ' + n + ' of ' + tiles + ' files are opened, and the tiles agree (got ' + b[0] + ')');
    }
    await go(pr.id + ':1'); await pick('pr-x', 1);
    t = (await tables())[0];
    ok(t.length === 8 && t.every(r => r[3] === '10 MB' && r[4] === '$0.000050'), 'wildcard lab: at this size every query pays the 10 MB minimum, $0.00005');
    await pick('pr-x', 1000);
    t = (await tables())[0];
    const billedB = b => Math.max(1e7, Math.ceil(b / 1e6) * 1e6);
    ok(same(t.map(r => r[4]), PC.map(c => usd(billedB(c.bytes_of_two_columns * 1000) / 1e12 * 5))), 'wildcard lab: at a thousand times the size, the cost of each query is the example rate times the billed bytes (got ' + t.map(r => r[4]).join(' ') + ')');
    ok(t[0][4] !== t[4][4] && +t[0][4].slice(1) > +t[4][4].slice(1) * 40, 'wildcard lab: at that size a full scan costs more than 40 times one day');

    // dedicated pool lab: the 60 bars, and what a join moves
    const ds = scene('distribution'), DD = await counts('dedicated.distribution');
    await go(ds.id + ':0'); await reset('ds', null);
    const cols = ['order_id', 'customer_id', 'order_date', 'store_id', 'status', 'channel', 'product_id'];
    for (const c of cols) {
      await pick('ds-h', 'HASH(' + c + ')');
      const bk = DD.by_column[c].buckets, mxv = Math.max(...bk), empty = bk.filter(x => x === 0).length, b = await bigs();
      ok(bk.length === 60 && bk.reduce((a, x) => a + x, 0) === DD.rows && same([b[0], b[1], b[2]], [(mxv / (DD.rows / 60)).toFixed(2) + 'x', empty + ' of 60', n0(mxv)]) && await cnt('.dist i') === 60 && await cnt('.dist i.empty') === empty, 'distribution lab, HASH(' + c + '): the busiest of 60 holds ' + n0(mxv) + ' rows and ' + empty + ' stay empty (got ' + b.join(' | ') + ')');
    }
    await pick('ds-h', 'ROUND_ROBIN');
    ok(same((await bigs()).slice(0, 2), ['1.00x', '0 of 60']), 'distribution lab: round robin is even by definition');
    await pick('ds-h', 'REPLICATED');
    ok(same(await bigs(), ['1 copy', 'none', 'small only']), 'distribution lab: a replicated table is one copy on each node');
    await go(ds.id + ':1');
    const MOVE = { 'HASH(customer_id)': { 'HASH(customer_id)': 'none', 'REPLICATED': 'none', 'ROUND_ROBIN': 'the small table moves' }, 'HASH(order_id)': { 'HASH(customer_id)': 'the big table may move', 'REPLICATED': 'none', 'ROUND_ROBIN': 'rows of one or both tables move' }, 'ROUND_ROBIN': { 'HASH(customer_id)': 'the big table may move', 'REPLICATED': 'none', 'ROUND_ROBIN': 'rows of one or both tables move' } };
    for (const f of Object.keys(MOVE)) for (const d of Object.keys(MOVE[f])) { await pick('ds-f', f); await pick('ds-d', d); ok((await bigs())[0] === MOVE[f][d], 'distribution lab, orders ' + f + ' and customers ' + d + ': ' + MOVE[f][d]); }
    await go(ds.id + ':2');
    t = (await tables())[0];
    const rank = cols.map(c => [c, Math.max(...DD.by_column[c].buckets) / (DD.rows / 60)]).sort((a, b) => a[1] - b[1]).map(r => r[0]);
    ok(same(t.map(r => r[0]), rank) && same(rank.slice(0, 2), ['order_id', 'customer_id']) && t.map(r => r[4]).filter(v => v === 'spreads well').length === 2, 'distribution lab: the columns are ranked from the most even to the most skewed, and the two with many values spread well');

    // Event Hubs lab: batch sizes from the recording, the checkpoint store, and the replay after a crash
    const eh = scene('ehub'), EB = await counts('eventhubs.batch');
    await go(eh.id + ':0'); await reset('eh', null);
    for (const r of EB.rows) for (const key of [0, 1]) {
      await pick('eh-l', r.limit_bytes); await pick('eh-p', r.payload_bytes); await pick('eh-k', key);
      const n = key ? r.events_with_key : r.events_in_batch, b = await bigs();
      ok(b[0] === n0(n) && b[1] === (n ? n0(Math.ceil(1e6 / n)) : 'never'), 'Event Hubs lab, limit ' + r.limit_bytes + ', body ' + r.payload_bytes + ', key ' + key + ': ' + n + ' events fit (got ' + b[0] + ')');
    }
    await pick('eh-l', 262144); await pick('eh-p', 300000);
    ok(/does not fit a batch/.test(await text()) && /ValueError/.test(await text()), 'Event Hubs lab: an event bigger than the batch limit raises ValueError');
    await go(eh.id + ':1'); await reset('eh', null);
    const OWN = [['worker-A', 'worker-A', 'worker-A', 'worker-A'], ['worker-A', 'worker-A', 'worker-A', 'worker-A'], ['worker-A', 'worker-B', 'worker-A', 'worker-A'], ['worker-A', 'worker-B', 'worker-A', 'worker-A']];
    for (let c = 0; c < 4; c++) {
      await pick('eh-s', c); t = (await tables())[0];
      ok(same(t.slice(0, 4).map(r => r[1].replace('ownerid = ', '')), OWN[c]) && t.length === (c === 3 ? 5 : 4), 'Event Hubs lab, call ' + (c + 1) + ': the ownership blobs name ' + OWN[c].join(', ') + (c === 3 ? ', and a checkpoint blob appears' : ''));
    }
    ok(/offset = 8192/.test(t[4][1]) && /sequencenumber = 83/.test(t[4][1]), 'Event Hubs lab: the checkpoint blob holds offset 8192 and sequence number 83, the second checkpoint');
    await pick('eh-s', 1);
    ok(/\[\]/.test(await page.innerText('.lab .callout.tip')), 'Event Hubs lab: a claim with a stale ETag returns an empty list');
    await go(eh.id + ':2');
    for (const [k, rep, writes] of [[1, 0, '1,000,000'], [10, 7, '100,000'], [100, 47, '10,000'], [1000, 547, '1,000']]) {
      await pick('eh-c', k);
      const b = await bigs();
      ok(b[0] === n0(2547 - rep) && b[1] === String(rep) && b[2] === writes, 'Event Hubs lab, checkpoint every ' + k + ': a crash at 2,547 repeats ' + rep + ' events, and a million events write ' + writes + ' checkpoints (got ' + b.join(' | ') + ')');
    }

    // queue lab: one message that keeps failing
    const qu = scene('queue');
    await go(qu.id + ':0'); await reset('qu', null);
    ok(await cnt('[data-act="qu-n"]') === 4, 'queue lab: four moments on the timeline');
    for (let k = 0; k < 4; k++) {
      await pick('qu-n', k); const b = await bigs(), tx = await page.innerText('.lab .callout.tip');
      ok(b[2] === (k === 3 ? 'in the poison queue' : 'in the main queue') && new RegExp('dequeue count is ' + (k + 1) + '\\b').test(tx) && /nothing, because the message is hidden/.test(tx), 'queue lab, receive ' + (k + 1) + ': dequeue count ' + (k + 1) + (k === 3 ? ', and the client moved the message to the poison queue' : ''));
    }
    await go(qu.id + ':1');
    t = (await tables())[0];
    ok(t.length === 3 && t[0][1] === 'PopReceiptMismatch' && t[1][1] === 'RequestBodyTooLarge' && t[2][1] === 'QueueNotFound', 'queue lab: three errors of the emulator, an old pop receipt, a message over 64 KB, and a queue that does not exist');

    // bill lab: the arithmetic of the example rates, worked out by hand in azure/verify/check_widgets.js
    const bl = scene('bill');
    await go(bl.id + ':0'); await reset('bl', null);
    ok(await cnt('.gantt .lane') === 10 && same(await bigs(), ['$7,489', '58 %']), 'bill lab: ten lines add up to $7,488.64, and the dedicated pool is 58 percent of it (got ' + (await bigs()).join(' | ') + ')');
    ok(await cnt('.gbar.bad') === 1, 'bill lab: one bar, the biggest line, is marked');
    await go(bl.id + ':1');
    const SAVED = { life: 280, pause: 2160, logs: 828, parquet: 100, batch: 162 };
    ok(same(await chipVals('bl-s'), ['life', 'pause', 'logs', 'parquet', 'batch']), 'bill lab offers five savings');
    for (const k of Object.keys(SAVED)) {
      await pick('bl-s', k); const b = await bigs();
      ok(b[0] === '$7,489' && b[1] === usd(7488.64 - SAVED[k]) && b[2] === usd(SAVED[k]), 'bill lab, saving "' + k + '": the month falls by ' + usd(SAVED[k]) + ' (got ' + b.join(' | ') + ')');
      await pick('bl-s', k);
    }
    for (const k of Object.keys(SAVED)) await pick('bl-s', k);
    ok(same(await bigs(), ['$7,489', '$3,959', '$3,530']), 'bill lab: the five savings together leave $3,958.64 and save $3,530 (got ' + (await bigs()).join(' | ') + ')');
    for (const k of Object.keys(SAVED)) await pick('bl-s', k);
  }

  // ---------- databricks only: the labs must show what Spark and Delta Lake recorded, and the arithmetic must be right ----------
  // The expected values below were worked out by hand from the recording (see databricks/verify/check_widgets.js) and are not read from the widgets.
  if (name === 'databricks') {
    const norm = s => s.replace(/ /g, ' ').split('\n').map(l => l.trimEnd()).join('\n').trim();
    const blocks = () => page.$$eval('#stage-body .code', bs => bs.map(b => [...b.querySelectorAll('.ln .tx')].map(x => x.textContent).join('\n')));
    const tables = () => page.$$eval('.lab .tbl', ts => ts.map(t => [...t.querySelectorAll('tbody tr')].map(r => [...r.children].map(td => td.innerText.trim()))));
    const bigs = () => page.$$eval('.lab-out .big b', els => els.map(e => e.textContent));
    const pick = async (act, v) => { await page.click('[data-act="' + act + '"][data-v="' + v + '"]'); await page.waitForTimeout(15); };
    const scene = kind => S.find(x => x.type === 'widget' && x.kind === kind);
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

    // Delta log lab: six commits, the files that are live at each, and the rows that changed between two versions
    const dl = scene('deltalog');
    const OPS = ['WRITE', 'WRITE', 'UPDATE', 'DELETE', 'MERGE', 'OPTIMIZE'], LIVE = [1, 2, 2, 2, 5, 1], ROWS = [3, 5, 5, 4, 9, 9];
    await go(dl.id + ':0');
    for (let v = 0; v < 6; v++) {
      await pick('dl-v', v);
      const want = await page.evaluate(v => LAB.get.commitText('delta.orders', v), v);
      ok(norm((await blocks())[0]) === norm(want), 'Delta log lab, version ' + v + ': the JSON on screen is the commit file that was recorded');
      ok((await bigs())[0] === OPS[v], 'Delta log lab, version ' + v + ' is a ' + OPS[v]);
    }
    await go(dl.id + ':1');
    for (let v = 0; v < 6; v++) {
      await pick('dl-v', v);
      const b = await bigs();
      ok(same(b, [LIVE[v] + ' files', ROWS[v] + ' rows']), 'Delta log lab, version ' + v + ': ' + LIVE[v] + ' live files and ' + ROWS[v] + ' rows (got ' + b.join(' | ') + ')');
      ok((await tables())[0].length === LIVE[v] && await cnt('.lab-out .big.good') === 1, 'Delta log lab, version ' + v + ': the table lists the live files and the log statistics add up to the rows');
    }
    await go(dl.id + ':2');
    await pick('dl-a', 1); await pick('dl-b', 4);
    let t = (await tables())[0];
    ok(same(t.filter(r => r[0] === 'added').map(r => r[1]), ['O-5006', 'O-5007', 'O-5008', 'O-5009', 'O-5010']), 'Delta log lab: version 4 adds five orders to version 1');
    ok(same(t.filter(r => r[0] === 'changed').map(r => r[1] + ' ' + r[4].split(',')[0]), ['O-5002 PLACED']), 'Delta log lab: one order changed from PLACED');
    ok(same(t.filter(r => r[0] === 'removed').map(r => r[1]), ['O-5005']), 'Delta log lab: the cancelled order was deleted');
    await pick('dl-a', 3); await pick('dl-b', 3);
    ok(await cnt('.lab .tbl') === 0 && /hold the same rows/.test(await text()), 'Delta log lab: a version does not differ from itself');

    // writer lab: which of the four pairs fails, and the error that Delta Lake printed
    const cf = scene('conflicts');
    await go(cf.id + ':0');
    for (const [k, verdict] of [['append_append', 'A committed'], ['update_append', 'A failed'], ['update_append_partitioned', 'A committed'], ['update_update', 'A failed']]) {
      await pick('cf-pick', k);
      ok((await bigs())[0] === verdict, 'writer lab, ' + k + ': ' + verdict);
      const bl = await blocks();
      if (verdict === 'A failed') {
        const want = await page.evaluate(k => LAB.get.text('delta.conflict_' + k), k);
        ok(bl.length === 1 && norm(bl[0]) === norm(want) && norm(bl[0]).startsWith('[DELTA_CONCURRENT_APPEND'), 'writer lab, ' + k + ': the error on screen is the one that was recorded');
      } else ok(bl.length === 0, 'writer lab, ' + k + ': no error is shown when both writers commit');
    }
    await go(cf.id + ':1');
    t = (await tables())[0];
    ok(same(t.map(r => [r[1], r[2], r[3]]), [['committed', 'committed', '5'], ['ConcurrentAppendException', 'committed', '4'], ['committed', 'committed', '4'], ['ConcurrentAppendException', 'committed', '3']]), 'writer lab: the summary lists the outcome of all four pairs');

    // watermark lab: the three arrivals, the window table, and the stream against the batch recount
    const wm = scene('watermark');
    await go(wm.id + ':0');
    const WM = [['09:07', '08:57', '0'], ['09:25', '09:15', '0'], ['09:31', '09:21', '1']];
    for (let k = 0; k < 3; k++) {
      await pick('wm-k', k);
      const b = await bigs();
      ok(same(b, WM[k]), 'watermark lab, arrival ' + (k + 1) + ': largest event ' + WM[k][0] + ', watermark ' + WM[k][1] + ', dropped ' + WM[k][2] + ' (got ' + b.join(' | ') + ')');
      const rec = await page.evaluate(k => LAB.real.counts['stream.watermark_runs'][k].watermark.slice(11, 16), k);
      ok(b[1] === rec, 'watermark lab, arrival ' + (k + 1) + ': the watermark is the one Spark reported');
    }
    t = await tables();
    ok(t[0].length === 2 && t[0][0][0] === '09:04' && t[0][0][2].startsWith('dropped') && t[0][1][2] === 'counted', 'watermark lab: in arrival 3 the 09:04 event is dropped and the 09:31 event is counted');
    ok(same(t[1], [['09:00 to 09:10', '3', 'emitted with 3 orders'], ['09:10 to 09:20', '1', 'emitted with 1 orders'], ['09:20 to 09:30', '1', 'open'], ['09:30 to 09:40', '1', 'open']]), 'watermark lab: window states after arrival 3 (got ' + JSON.stringify(t[1]) + ')');
    await go(wm.id + ':1');
    t = (await tables())[0];
    ok(same(t, [['09:00 to 09:10', '3', '4', '1'], ['09:10 to 09:20', '1', '1', '0'], ['09:20 to 09:30', 'not emitted yet', '1', 'still open'], ['09:30 to 09:40', 'not emitted yet', '1', 'still open']]), 'watermark lab: the stream says 3 and the batch recount says 4 for the first window (got ' + JSON.stringify(t) + ')');

    // join lab: the operators counted in each plan, and the highlighted line
    const jn = scene('joins');
    const JN = [['plan.join_default', 'BroadcastHashJoin', 0, 1, 0], ['plan.join_no_broadcast', 'SortMergeJoin', 2, 0, 2], ['plan.join_hint_shuffle_hash', 'ShuffledHashJoin', 2, 0, 0], ['plan.join_hint_merge', 'SortMergeJoin', 2, 0, 2], ['plan.join_hint_broadcast', 'BroadcastHashJoin', 0, 1, 0]];
    await go(jn.id + ':0');
    for (const [k, join, sh, br] of JN) {
      await pick('jn-pick', k);
      ok(same(await bigs(), [join, String(sh), String(br)]), 'join lab, ' + k + ': ' + join + ', ' + sh + ' shuffles, ' + br + ' broadcasts');
      const want = await page.evaluate(k => LAB.get.text(k), k);
      ok(norm((await blocks())[0]) === norm(want), 'join lab, ' + k + ': the plan on screen is the plan Spark printed');
      const hl = await page.$$eval('#stage-body .ln.on .tx', xs => xs.map(x => x.textContent));
      ok(hl.length === 1 && hl[0].includes(join), 'join lab, ' + k + ': the highlighted line holds the join');
    }
    await go(jn.id + ':1');
    ok(same((await tables())[0].map(r => r.slice(1)), JN.map(([, j, s, b, o]) => [j, String(s), String(b), String(o)])), 'join lab: the summary counts joins, shuffles, broadcasts and sorts of all five plans');

    // skew lab: partition sizes by key and with a salt, and the two final plans
    const sk = scene('skew');
    await go(sk.id + ':0');
    ok(same(await bigs(), ['6.6x', '1.4x']), 'skew lab: the biggest partition is 6.6 times the average by key and 1.4 times with a salt');
    const lanes = await page.$$eval('.gantt', gs => gs.map(g => [...g.querySelectorAll('.lane-v')].map(x => +x.textContent.replace(/,/g, ''))));
    ok(lanes.length === 2 && lanes.every(l => l.length === 8 && l.reduce((a, b) => a + b, 0) === 300000), 'skew lab: both layouts show 8 partitions that hold 300,000 rows');
    ok(Math.max(...lanes[0]) >= 240000 && Math.max(...lanes[1]) < 60000, 'skew lab: by key one partition holds at least the 240,000 rows of K-0 (80 percent of 300,000), with a salt none holds 60,000');
    await go(sk.id + ':1');
    const sb = await blocks();
    ok(sb.length === 2 && !/skew=true/.test(sb[0]) && /skew=true/.test(sb[1]) && /AQEShuffleRead skewed/.test(sb[1]), 'skew lab: only the plan with skew handling on says skew=true');

    // data skipping lab: the lit squares are the files whose min and max can hold the value
    const sp = scene('skipping');
    await go(sp.id + ':0');
    for (const c of ['C-0420', 'C-0000', 'C-0603', 'C-1000', 'C-1999']) {
      await pick('sk-v', c);
      const b = await bigs(), grids = await page.$$eval('.skipgrid', gs => gs.map(g => g.querySelectorAll('.skf.read').length));
      ok(same(b, ['16 of 16', '1 of 3']) && same(grids, [16, 1]), 'skipping lab, ' + c + ': 16 of 16 files before and 1 of 3 after, and the squares agree (got ' + b.join(' | ') + ' and ' + grids.join(',') + ')');
    }
    await pick('sk-v', 'C-0420');
    ok(/Recorded\./.test(await text()), 'skipping lab: the filter that Spark really ran is marked as recorded');
    await go(sp.id + ':1');
    ok(same(await bigs(), ['customer_id', '1 of 2', '16 to 2']), 'skipping lab: liquid clustering reads 1 of 2 files and OPTIMIZE joined 16 files into 2 (got ' + (await bigs()).join(' | ') + ')');

    // cost lab: every number below was worked out by hand
    const dbu = scene('dbu');
    await go(dbu.id + ':0');
    for (const [a, v] of [['d-type', 'jobs'], ['d-w', 4], ['d-vm', 0.5], ['d-dbu', 1], ['d-h', 2], ['d-spot', 0]]) await pick(a, v);   // the lab keeps its state, so set every choice
    ok(same(await bigs(), ['300', '$90', '$150', '$240']), 'cost lab default: 5 nodes x 1 DBU x 2 h x 30 days = 300 DBUs at $0.30 = $90, VMs 5 x $0.50 x 60 h = $150, total $240');
    await pick('d-type', 'allp');
    ok(same(await bigs(), ['300', '$165', '$150', '$315']), 'cost lab: all-purpose compute, 300 DBUs at $0.55 = $165');
    await pick('d-type', 'sql');
    ok(same(await bigs(), ['60', '$42', '$0', '$42']), 'cost lab: serverless SQL, 60 DBUs at $0.70 = $42 and no VM charge');
    await pick('d-type', 'jobs'); await pick('d-spot', 0.6);
    ok(same(await bigs(), ['300', '$90', '$78', '$168']), 'cost lab: spot workers, the driver stays on demand: (1 + 4 x 0.4) x $0.50 x 60 h = $78');
    await pick('d-spot', 0); await pick('d-w', 16); await pick('d-h', 24);
    ok(same(await bigs(), ['12,240', '$3,672', '$6,120', '$9,792']) && await cnt('.lab-out .big.bad') === 1, 'cost lab: 17 nodes for 24 h a day: 12,240 DBUs, $3,672 and $6,120 give $9,792, flagged red');
    await pick('d-w', 4); await pick('d-h', 2);
    await go(dbu.id + ':1');
    t = (await tables())[0];
    ok(same(t, [['Jobs compute', '$0.30', '300', '$90', '$150', '$240'], ['All-purpose compute', '$0.55', '300', '$165', '$150', '$315']]) && /1\.8 times/.test(await text()), 'cost lab: the same cluster costs $240 on jobs compute and $315 on all-purpose compute, 1.8 times the DBU charge');
    await go(dbu.id + ':2');
    await pick('d-run', 45); await pick('d-idle', 120);
    t = (await tables())[0];
    ok(same(t, [['120 minutes', '2.75', '$433'], ['10 minutes', '0.92', '$144']]), 'cost lab: a 45 minute job with 120 idle minutes bills 2.75 hours and $433, with 10 idle minutes 0.92 hours and $144 (got ' + JSON.stringify(t) + ')');
    await pick('d-idle', 10);
    t = (await tables())[0];
    ok(t[0][0] === '10 minutes' && t[0][2] === '$144' && await cnt('.callout.good') >= 1, 'cost lab: with 10 idle minutes the two rows agree');
  }

  if (name === 'ai') {
    // The expected values below are worked out by hand from the recording (ai/js/real.js) or from arithmetic, and are not read from the widgets.
    // The keys under pg.* vary a little between recordings, so the pgvector lab reads them from the recording.
    const bigs = () => page.$$eval('.lab-out .big b', els => els.map(e => e.textContent));
    const tables = () => page.$$eval('.lab .tbl', ts => ts.map(t => [...t.querySelectorAll('tbody tr')].map(r => [...r.children].map(td => td.innerText.trim()))));
    const pills = () => page.$$eval('.lab .chain li .pill', ps => ps.map(p => p.textContent));
    const pick = async (act, v) => { await page.click('[data-act="' + act + '"][data-v="' + v + '"]'); await page.waitForTimeout(15); };
    const scene = kind => S.find(x => x.type === 'widget' && x.kind === kind);
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const real = (sec, k) => page.evaluate(([sec, k]) => LAB.real[sec][k], [sec, k]);
    const n0 = x => x.toLocaleString('en-US');
    const usd = x => '$' + (x >= 100 ? n0(Math.round(x)) : x >= 1 ? x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : x >= 0.01 ? x.toFixed(3) : x === 0 ? '0' : x.toPrecision(2));
    // the widgets keep their state while the page stays open, and the generic checks above have clicked their chips: start every lab from its default
    const reset = (k, v) => page.evaluate(([k, v]) => { LAB.app.local[k] = v; LAB.app.render(true); }, [k, v === undefined ? null : v]).then(() => page.waitForTimeout(20));
    const text = () => page.evaluate(() => document.querySelector('#stage-body').innerText);
    let t;

    // every lab is used by at least one scene, and every scene of a lab opens without an error
    const kinds = ['dedup', 'chunker', 'vectors', 'ann', 'pgv', 'rank', 'acl', 'pipeline', 'tokens', 'retry', 'agent', 'sqlguard', 'mcpwire', 'spans', 'defence', 'finetune', 'ckpt', 'release'];
    for (const k of kinds) ok(!!scene(k), 'the ' + k + ' lab is used by a scene');
    ok(S.filter(x => x.type === 'widget').length >= 19, 'the course has at least 19 lab scenes');

    // near-copies: the two handbook versions are 0.809 alike, the estimate is 0.75; the LSH threshold decides which pairs are grouped
    await go(scene('dedup').id + ':0'); await reset('dd', { p: 0, t: 0.5 });
    ok(same(await bigs(), ['0.809', '0.75', '0.059']), 'dedup lab: exact 0.809, MinHash 0.75, a difference of 0.059');
    await go(scene('dedup').id + ':1');
    for (const [th, n] of [[0.3, '2'], [0.5, '1'], [0.7, '1'], [0.9, '0']]) { await pick('dd-t', th); ok(same(await bigs(), [n]), 'dedup lab: at threshold ' + th + ' ' + n + ' pair(s) are grouped'); }

    // chunking: the recorded rows for five strategies and five sizes
    const ckS = scene('chunker');
    await go(ckS.id + ':1'); await reset('ck', { s: 'recursive 500', z: 500 });
    for (const [name, want] of [['fixed 500, no overlap', ['81', '425', '28 %', '26 of 27']], ['fixed 500, overlap 100', ['129', '307', '19 %', '27 of 27']], ['whole sentences up to 500', ['82', '414', '0 %', '27 of 27']], ['recursive 500', ['87', '395', '9 %', '27 of 27']], ['by heading, up to 500', ['181', '177', '2 %', '27 of 27']]]) {
      await pick('ck-s', name); ok(same(await bigs(), want), 'chunking lab, ' + name + ': ' + want.join(', '));
    }
    await go(ckS.id + ':2');
    for (const [z, want] of [[150, ['314', '108', '27 of 27']], [500, ['87', '395', '27 of 27']], [1500, ['62', '555', '27 of 27']]]) { await pick('ck-z', z); ok(same(await bigs(), want), 'chunking lab, size ' + z + ': ' + want.join(', ')); }
    await pick('ck-z', 500); ok((await text()).includes('1,975 characters'), 'chunking lab: size 500 sends 1,975 characters for the top five');

    // vectors: cosine, dot and distance by hand, then the memory bill
    const vcS = scene('vectors');
    await go(vcS.id + ':1'); await reset('vc', { g: {}, p: 0, u: false, n: 1e6, d: 1536, b: 32 });
    ok(same((await bigs()).slice(1), ['50.000', '1.000', '5.000']), 'vector lab: (3,4) and (6,8) have dot 50, cosine 1, distance 5');
    await pick('vc-p', 1); ok(same((await bigs()).slice(1), ['24.000', '0.960', '1.414']), 'vector lab: (3,4) and (4,3) have dot 24, cosine 0.96, distance 1.414');
    await pick('vc-u', 'unit length'); ok(same((await bigs()).slice(1), ['0.960', '0.960', '0.283']), 'vector lab: with unit length the dot product equals the cosine, 0.96, and the distance is 0.283');
    await pick('vc-p', 2); ok(same((await bigs()).slice(1), ['0.000', '0.000', '1.414']), 'vector lab: a right angle gives dot 0 and cosine 0');
    await go(vcS.id + ':2');
    ok(same(await bigs(), ['6.14 GB', '6,144 bytes']), 'vector lab: a million vectors of 1536 numbers at 32 bits take 6.14 GB');
    await pick('vc-b', 8); ok(same(await bigs(), ['1.54 GB', '1,536 bytes']), 'vector lab: at 8 bits they take 1.54 GB');
    await pick('vc-n', 1e8); await pick('vc-d', 3072); await pick('vc-b', 32); ok((await bigs())[0] === '1.23 TB', 'vector lab: 100 million vectors of 3072 numbers at 32 bits take 1.23 TB');
    await go(vcS.id + ':0'); await reset('vc', { g: {}, p: 0, u: false, n: 1e6, d: 1536, b: 32 });
    for (let n = 0; n < 8; n++) await pick('vc-g', n + ':close');
    ok(/Answered 8 of 8, right 3\./.test(await text()), 'vector lab: answering "close" for all eight pairs is right for the three pairs with a cosine of 0.5 or more');

    // indexes: recall and work from the recording
    const anS = scene('ann');
    await go(anS.id + ':0'); await reset('an', { m: 16, ef: 32, np: 4, ix: 0 });
    ok(same(await bigs(), ['0.967', '500', '1.7 %']), 'ann lab: M 16 with efSearch 32 gives recall 0.967 with 500 distances (1.7 percent)');
    await pick('an-m', 8); await pick('an-e', 8); ok(same(await bigs(), ['0.589', '175', '0.6 %']), 'ann lab: M 8 with efSearch 8 gives recall 0.589');
    await pick('an-m', 32); await pick('an-e', 256); ok(same(await bigs(), ['1', '934', '3.1 %']), 'ann lab: M 32 with efSearch 256 gives recall 1 at 934 distances');
    await go(anS.id + ':1');
    for (const [np, want] of [[1, ['0.35', '165', '0.6 %']], [8, ['0.988', '1,042', '3.5 %']], [64, ['1', '7,683', '25.6 %']]]) { await pick('an-n', np); ok(same(await bigs(), want), 'ann lab, nprobe ' + np + ': ' + want.join(', ')); }
    await go(anS.id + ':2');
    for (const [ix, want] of [[0, ['256 bytes', '256 bytes', '1']], [3, ['8 bytes', '20 bytes', '0.129']]]) { await pick('an-i', ix); ok(same(await bigs(), want), 'ann lab, index ' + ix + ': ' + want.join(', ')); }

    // pgvector: the rows that a filter leaves, from the recording
    const pgS = scene('pgv'), PF = await real('tables', 'pg.filter');
    await go(pgS.id + ':0'); await reset('pg', { t: 1, ef: 40, pr: 1 });
    for (const row of PF.rows) { await pick('pg-t', row[0]); const b = await bigs(); ok(same(b, [row[1], row[2].toFixed(1), String(row[3]), String(row[4])]), 'pgvector lab, tenant ' + row[0] + ': ' + row[2] + ' rows of 10 with the default, ' + row[3] + ' with iterative scan'); }
    await go(pgS.id + ':1'); const HR = await real('tables', 'pg.hnsw_recall'), IV2 = await real('tables', 'pg.ivfflat');
    await pick('pg-e', 40); await pick('pg-p', 1); ok(same(await bigs(), [String(HR.rows.find(r => r[0] === 40)[1]), String(IV2.rows.find(r => r[0] === 1)[1])]), 'pgvector lab: the recall at ef_search 40 and at one probe');
    await go(pgS.id + ':2'); ok(same((await bigs()).slice(0, 2), ['40', '100']), 'pgvector lab: LIMIT 100 returns 40 rows with ef_search 40 and 100 rows with 200');

    // scoring: hit at k and MRR from the 24 ranks, nDCG for a list that is clicked
    const rkS = scene('rank');
    await go(rkS.id + ':0'); await reset('rk', { m: 0, mt: 'hit@3', k: 'all', rel: [0, 1, 0, 0, 1, 0, 0, 0, 0, 0], q: 8, rk: 60 });
    for (const [m, mt, kd, want] of [[0, 'hit@3', 'all', ['0.875', '21 of 24']], [1, 'hit@3', 'all', ['0.792', '19 of 24']], [2, 'hit@3', 'all', ['0.875', '21 of 24']], [0, 'hit@1', 'all', ['0.667', '16 of 24']], [0, 'hit@5', 'all', ['0.917', '22 of 24']], [2, 'MRR@10', 'all', ['0.754']], [1, 'hit@3', 'table', ['0.000', '0 of 1']], [0, 'hit@3', 'meaning', ['0.625', '5 of 8']]]) {
      await pick('rk-m', m); await pick('rk-t', mt); await pick('rk-k', kd);
      ok(same(await bigs(), want), 'scoring lab, method ' + m + ', ' + mt + ', ' + kd + ': ' + want.join(' / '));
    }
    await go(rkS.id + ':1');
    ok(same(await bigs(), ['1', '1', '0.500', '0.624']), 'scoring lab: right chunks at positions 2 and 5 give hit 1 at 3 and 5, MRR 0.5 and nDCG 0.624');
    await pick('rk-r', 1); await pick('rk-r', 0); ok(same(await bigs(), ['1', '1', '1.000', '0.850']), 'scoring lab: right chunks at positions 1 and 5 give MRR 1 and nDCG 0.85 (1 + 0.387 over the ideal 1.631)');
    await pick('rk-r', 0); await pick('rk-r', 4); await pick('rk-r', 7); ok(same(await bigs(), ['0', '0', '0.125', '0.193']), 'scoring lab: one right chunk at position 8 gives hit 0, MRR 0.125 and nDCG 0.193 (0.315 over the ideal 1.631)');
    await go(rkS.id + ':2'); t = (await tables())[0];
    ok(same(t, [['not in top 10', '9', '0 + 1/(60+9) = 0.0145', '10']]), 'scoring lab: question q09, the vector rank 9 gives an RRF score of 0.0145');

    // access control: where the filter runs, for the manager role
    const acS = scene('acl');
    await go(acS.id + ':0'); await reset('ac', { f: 'none' });
    for (const [f, want] of [['none', ['18', '0', '10']], ['after', ['0', '18', '0']], ['inside', ['0', '0', '0']]]) { await pick('ac-f', f); ok(same(await bigs(), want), 'access lab, filter ' + f + ': ' + want.join(', ')); }

    // ingestion runs and the alias
    const plS = scene('pipeline');
    await go(plS.id + ':0'); await reset('pl', { r: 0, a: 0, mx: 0 });
    for (const [r, want] of [[0, ['87', '0', '0', '87', '0']], [1, ['0', '87', '0', '0', '0']], [2, ['1', '86', '1', '1', '0']], [3, ['0', '84', '0', '0', '0']], [4, ['0', '84', '0', '0', '1']], [5, ['0', '84', '0', '0', '1']]]) { await pick('pl-r', r); ok(same(await bigs(), want), 'ingestion lab, run ' + (r + 1) + ': ' + want.join(', ')); }
    await go(plS.id + ':1'); ok((await bigs())[0] === 'index-v1', 'ingestion lab: the alias starts on the old index');
    for (let i = 0; i < 3; i++) await pick('pl-a', 'next');
    ok(same(await bigs(), ['index-v2', '0.75', '0.833']), 'ingestion lab: after three steps the alias points to index-v2, scored 0.833 against 0.75');
    await go(plS.id + ':2'); await pick('pl-m', 3); ok((await bigs())[0] === 'hit@5 0.917', 'ingestion lab: a query of another model of the same size ran, with hit at 5 of 0.917 on the stand-in');
    await pick('pl-m', 2); ok(/^error:/.test((await bigs())[0]), 'ingestion lab: another size is an error');

    // tokens: the stand-in tokenizer samples, then the prompt arithmetic
    const tkS = scene('tokens');
    await go(tkS.id + ':0'); await reset('tk', { x: 0, c: 5, t: 95, q: 1000, p: 1, rk: 0, ca: 0, sm: 0, bt: 0 });
    await pick('tk-x', 7); ok(same(await bigs(), ['42', '118', '116', '0.36']), 'tokens lab: Thai text of 42 characters is 118 bytes and 116 tokens');
    await pick('tk-x', 0); ok(same(await bigs(), ['86', '86', '18', '4.78']), 'tokens lab: plain English of 86 characters is 18 tokens');
    const tkB = S.find(x => x.type === 'widget' && x.kind === 'tokens' && x.id === 'm7-tokens-lab');
    await go(tkB.id + ':0');
    const per = 300 + 5 * 95 + 40, perQ = per / 1e6 * 1 + 150 / 1e6 * 5;
    ok(same(await bigs(), [n0(per), usd(perQ), usd(perQ * 1000), usd(perQ * 30000)]), 'tokens lab: 5 chunks of 95 tokens make 815 input tokens, and the cost follows the example price of $1 per million');
    await pick('tk-c', 20); await pick('tk-t', 400); ok((await bigs())[0] === n0(300 + 20 * 400 + 40), 'tokens lab: 20 chunks of 400 tokens make 8,340 input tokens');

    // retries: the recorded rows, and the worst case of one call
    const rtS = scene('retry');
    await go(rtS.id + ':0'); await reset('rt', { sdk: 'anthropic', f: 0, mr: 2, to: 600 });
    for (const [f, want] of [[0, ['2', '0, 1', 'answer returned']], [2, ['3', '0, 1, 2', 'InternalServerError']], [3, ['1', '0', 'BadRequestError']], [4, ['2', '0, 1', 'APITimeoutError']], [5, ['1', '0', 'RateLimitError']]]) { await pick('rt-f', f); ok(same(await bigs(), want), 'retry lab, failure ' + f + ': ' + want.join(' / ')); }
    await pick('rt-s', 'openai'); await pick('rt-f', 3); ok(same(await bigs(), ['1', '0', 'BadRequestError']), 'retry lab: the OpenAI library also sends a bad request once');
    await go(rtS.id + ':1');
    ok(same(await bigs(), ['0.5, 1.0', '1.5 s', '1,802 s']), 'retry lab: 2 retries and a timeout of 600 seconds give waits of 0.5 and 1.0 and a worst case of 1,802 seconds');
    await pick('rt-m', 0); await pick('rt-t', 20); ok(same(await bigs(), ['none', '0.0 s', '20 s']), 'retry lab: no retries and a timeout of 20 seconds give a worst case of 20 seconds');
    await pick('rt-m', 5); await pick('rt-t', 600); ok((await bigs())[2] === '3,610 s' || (await bigs())[2] === '60 min', 'retry lab: 5 retries of 600 seconds is more than an hour');

    // the agent: four replays, two designs, three limits
    const agS = scene('agent');
    await go(agS.id + ':0'); await reset('ag', { k: 0, n: 1, w: 'workflow', l: 1 });
    ok(same(await bigs(), ['1', '0', '1 of 5']), 'agent lab: run A starts with one message');
    await pick('ag-n', 'all'); ok(same(await bigs(), ['3', '2', '5 of 5']), 'agent lab: run A has 3 model calls and 2 tool results');
    await pick('ag-k', 2); await pick('ag-n', 'all'); ok(same(await bigs(), ['6', '5', '12 of 12']), 'agent lab: run C has 6 model calls and 5 tool results');
    await pick('ag-k', 3); await pick('ag-n', 'all'); ok(/paused/.test(await text()) && same(await bigs(), ['2', '1', '4 of 4']), 'agent lab: run D pauses for a person');
    await go(agS.id + ':1'); await pick('ag-w', 'agent'); ok(same(await bigs(), ['3', '2', 'the model', 'no']), 'agent lab: an agent asks the model 3 times and decides by the model');
    await pick('ag-w', 'workflow'); ok(same(await bigs(), ['1', '2', 'the code', 'yes']), 'agent lab: a workflow asks the model once');
    await go(agS.id + ':2'); await pick('ag-l', 1); ok(same(await bigs(), ['6', '5', 'answer']), 'agent lab: our limit of 6 steps ends with an answer'); await pick('ag-l', 2); ok(/raises an error/.test(await text()), 'agent lab: the library limit raises an error');

    // the SQL guard: the fourteen statements and what each layer did
    const sgS = scene('sqlguard');
    await go(sgS.id + ':0'); await reset('sg', { q: 0, g: {} });
    ok(await cnt('[data-act="sg-q"]') === 14, 'SQL guard lab: fourteen statements');
    await pick('sg-q', 6); await pick('sg-g', 'refuse'); ok((await text()).includes('Right.'), 'SQL guard lab: the e-mail query is refused by the guard');
    await pick('sg-g', 'allow'); ok((await text()).includes('The guard said refused.'), 'SQL guard lab: answering allow for the e-mail query is wrong');
    await go(sgS.id + ':1'); ok(same(await bigs(), ['14', '7', '7', '1']), 'SQL guard lab: 14 statements, 7 allowed, 7 refused, 1 that a read-only connection alone would have run');

    // MCP: messages and bytes in two protocol versions
    const mwS = scene('mcpwire');
    await go(mwS.id + ':0'); await reset('mw', { m: 0, f: 0, n: 3, sel: 0 });
    ok(same(await bigs(), ['18', '6,672', '296']), 'MCP lab: 18 messages, 6,672 bytes, and 296 bytes in an average tools/call request');
    await pick('mw-m', 1); ok(same(await bigs(), ['19', '4,041', '113']), 'MCP lab: the older version has 19 messages, 4,041 bytes, and 113 bytes in a tools/call request');
    await go(mwS.id + ':2'); ok((await bigs())[0] === '383', 'MCP lab: three tools cost 383 tokens of definitions');
    await pick('mw-n', 40); ok((await bigs())[0] === '5,110', 'MCP lab: forty tools of that size cost 5,110 tokens in every request');

    // traces
    const spS = scene('spans');
    await go(spS.id + ':0'); await reset('sp', { s: 2, q: 0 });
    ok(same(await bigs(), ['INTERNAL', 'ERROR', '2']), 'trace lab: the first tool span failed and recorded two events');
    await pick('sp-s', 1); ok(same(await bigs(), ['CLIENT', 'UNSET', '0']), 'trace lab: a model call is a client span with no error');
    await go(spS.id + ':1'); ok(same(await bigs(), ['6', '3', '2', '202 / 46']), 'trace lab: 6 spans, 3 model calls, 2 tool calls, 202 tokens in and 46 out');

    // defences
    const dfS = scene('defence');
    await go(dfS.id + ':1'); await reset('df', { r: 0 });
    for (const [r, want] of [[0, ['EUR 500.0', 'no']], [1, ['none', 'no']], [2, ['none', 'yes']], [3, ['none', 'no']]]) { await pick('df-r', r); ok(same(await bigs(), want), 'defence lab, run ' + (r + 1) + ': ' + want.join(' / ')); }
    await go(dfS.id + ':0'); ok(same((await bigs()).slice(0, 2), ['1', '2']), 'defence lab: the planted chunk ranks first and the right chunk second');

    // fine-tuning data
    const ftS = scene('finetune');
    await go(ftS.id + ':0'); await reset('ft', { s: 0, p: 0 });
    await pick('ft-s', 3); ok(same(await bigs(), ['161', '27', '25.5']), 'fine-tuning lab: 161 examples remain from 27 facts, with 25.5 words on average');
    await pick('ft-s', 2); ok((await bigs())[0] === '162', 'fine-tuning lab: exact de-duplication leaves 162');
    await go(ftS.id + ':1');
    await pick('ft-p', 0); ok(same(await bigs(), ['129', '32', '32']), 'fine-tuning lab: a random split leaves 32 of 32 validation answers in training');
    await pick('ft-p', 1); ok(same(await bigs(), ['131', '30', '0']), 'fine-tuning lab: a split by fact leaves 0');

    // checkpoints, approval, resume, durable
    const ckS2 = scene('ckpt');
    await go(ckS2.id + ':0'); await reset('ck2', { c: 2, d: 'approve' });
    for (const [c, want] of [[0, ['__start__', '0', '0', '2']], [2, ['tools', '1', '2', '2']], [4, ['tools', '2', '4', '1']], [6, ['done', '3', '6', '0']]]) { await pick('ck-c', c); ok(same(await bigs(), want), 'checkpoint lab, checkpoint ' + c + ': ' + want.join(', ')); }
    await go(ckS2.id + ':1'); await pick('ck-d', 'approve'); ok(same(await bigs(), ['0', '1', 'tools']), 'checkpoint lab: an approval writes one refund after the pause');
    await pick('ck-d', 'deny'); ok(same(await bigs(), ['0', '0', 'tools']), 'checkpoint lab: a refusal writes none');
    await go(ckS2.id + ':2'); t = (await tables())[0]; ok(same(t.find(r => r[0] === 'search_policies'), ['search_policies', '1', '2']), 'checkpoint lab: the read tool before the interrupt ran again on resume');
    await go(ckS2.id + ':3'); ok(same(await bigs(), ['3', '1']), 'checkpoint lab: 3 checkpoints in the file, and one refund written by a new graph object');

    // release gates
    const rlS = scene('release');
    await go(rlS.id + ':0'); await reset('rl', { c: 0, live: 'index-v2.db' });
    ok(same(await pills(), ['pass', 'fail', 'not reached', 'not reached', 'not reached']), 'release lab: the fixed 500 change passes the tests and fails the evaluation gate');
    await pick('rl-c', 2); ok(same(await pills(), ['pass', 'pass', 'next', 'next', 'next']), 'release lab: the keyword-only change passes both gates and goes on to the attack set and a canary');
    await pick('rl-c', 4); ok(same(await pills(), ['pass', 'fail', 'not reached', 'not reached', 'not reached']), 'release lab: the vector-only change fails the evaluation gate');
    await pick('rl-c', 5); ok(same(await pills(), ['fail', 'not reached', 'not reached', 'not reached', 'not reached']), 'release lab: removing the step limit is stopped by the tests');
    await pick('rl-c', 6); ok(same(await pills(), ['fail', 'not reached', 'not reached', 'not reached', 'not reached']), 'release lab: removing the approval is stopped by the tests');
    await go(rlS.id + ':1'); ok((await bigs())[0] === 'index-v2.db', 'release lab: the alias starts on the new index');
    await pick('rl-live', 'index-v1.db'); ok((await bigs())[0] === 'index-v1.db', 'release lab: one write moves the alias back');

    // the coding round: the query of mission 15 is run by verify_ai.py in DuckDB. Here: the table that it reads has 72 rows and 18 answers
    const chS = S.find(x => x.type === 'challenge');
    await go(chS.id + ':0'); ok((await text()).length > 500, 'coding round opens');
  }

  // ---------- gcp only: the labs must show what the recordings say, and the rules and the arithmetic must come out right ----------
  // Every expected value below is worked out here, in code that shares nothing with the widgets: from the recorded tables, from simple rules (what a role holds,
  // how sessions merge, how a retry ends), or from arithmetic on the recorded numbers.
  if (name === 'gcp') {
    const bigs = () => page.$$eval('.lab-out .big b', els => els.map(e => e.textContent));
    const bigCls = () => page.$$eval('.lab-out .big', els => els.map(e => e.className));
    const tables = () => page.$$eval('.lab .tbl', ts => ts.map(t => [...t.querySelectorAll('tbody tr')].map(r => [...r.children].map(td => td.innerText.trim()))));
    const pick = async (act, v) => { await page.click('[data-act="' + act + '"][data-v="' + v + '"]'); await page.waitForTimeout(12); };
    const chipVals = act => page.$$eval('[data-act="' + act + '"]', els => els.map(e => e.getAttribute('data-v')));
    const scene = kind => S.find(x => x.type === 'widget' && x.kind === kind);
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const counts = k => page.evaluate(k => LAB.real.counts[k], k);
    const table = k => page.evaluate(k => LAB.real.tables[k], k);
    const reset = (k, v) => page.evaluate(([k, v]) => { LAB.app.local[k] = v; LAB.app.render(true); }, [k, v === undefined ? null : v]).then(() => page.waitForTimeout(20));
    const num = s => parseFloat(String(s).replace(/[$,]/g, ''));
    const bytesOf = s => { const m = /([\d.,]+)\s*(KiB|MiB|GiB|TiB)/.exec(s); return m ? num(m[1]) * { KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3, TiB: 1024 ** 4 }[m[2]] : NaN; };
    const close = (a, b, rel, abs) => Math.abs(a - b) <= (abs || 0) + Math.abs(b) * (rel || 0);
    let t;

    // IAM lab: allow roles add up along the hierarchy, a deny wins, and creating a query job is checked in the project (so a role on a dataset cannot give it)
    const HOLDS = { viewer: ['getData'], editor: ['getData', 'updateData'], jobuser: ['jobs'], admin: ['getData', 'updateData', 'jobs'] };
    const LEVELS = ['organization', 'folder', 'project', 'dataset', 'table'];
    const iamWant = b => {
      const out = { getData: null, updateData: null, jobs: null };
      LEVELS.forEach((l, n) => (HOLDS[b[l]] || []).forEach(p => { if (p === 'jobs') { if (n <= 2) out.jobs = l; } else out[p] = l; }));
      return out;
    };
    const iam = scene('iam');
    await go(iam.id + ':0');
    const iamCases = [
      {}, { dataset: 'viewer' }, { folder: 'viewer' }, { project: 'admin' }, { organization: 'editor', table: 'viewer' }, { dataset: 'admin' }, { project: 'editor', dataset: 'viewer' }, { organization: 'admin', table: 'viewer' }
    ];
    for (const c of iamCases) {
      await reset('iam', null);
      const b = { organization: 'none', folder: 'none', project: 'none', dataset: 'none', table: 'none' };
      for (const l of LEVELS) if (c[l]) { await pick('iam-' + l, c[l]); b[l] = c[l]; }
      const want = iamWant(b), rows = (await tables())[0], got = rows.map(r => r[1]);
      const show = w => (w ? 'allowed, from the ' + w : 'not granted');
      ok(same(got, [show(want.getData), show(want.updateData), show(want.jobs)]), 'IAM lab ' + JSON.stringify(c) + ': what reaches the table (got ' + got.join(' | ') + ')');
      const verdict = want.getData && want.jobs ? 'the query runs' : want.getData ? 'refused: no permission to create a job' : want.jobs ? 'refused: no permission to read the table' : 'refused';
      ok((await bigs())[0] === verdict, 'IAM lab ' + JSON.stringify(c) + ': the verdict is "' + verdict + '" (got ' + (await bigs())[0] + ')');
    }
    await go(iam.id + ':1');
    for (const [tb, pj, deny] of [['none', 'none', 'off'], ['viewer', 'none', 'off'], ['none', 'jobuser', 'off'], ['viewer', 'jobuser', 'off'], ['viewer', 'jobuser', 'on'], ['none', 'none', 'on']]) {
      await reset('iam', null);
      await pick('iam-table', tb); await pick('iam-project', pj); await pick('iam-deny', deny);
      const verdict = deny === 'on' ? 'refused by the deny policy' : tb === 'viewer' && pj === 'jobuser' ? 'the query runs' : tb === 'viewer' ? 'refused: no permission to create a job' : pj === 'jobuser' ? 'refused: no permission to read the table' : 'refused';
      ok((await bigs())[0] === verdict, 'IAM lab, read ' + tb + ', job ' + pj + ', deny ' + deny + ': "' + verdict + '" (got ' + (await bigs())[0] + ')');
    }

    // listing lab: the objects and the prefixes that were recorded for each call are counted again from the names
    const LS = await table('gcs.listing'), ls = scene('listing');
    await go(ls.id + ':0'); await reset('ls', { c: 1 });
    ok(same(await chipVals('ls-c'), LS.rows.map((r, n) => String(n))), 'listing lab: one chip for each recorded call');
    for (let n = 0; n < LS.rows.length; n++) {
      await pick('ls-c', n);
      const r = LS.rows[n], objs = r[3] === '-' ? [] : r[3].split(', '), pfx = r[4] === '-' ? [] : r[4].split(', '), b = await bigs();
      ok(r[2] === objs.length, 'recorded listing ' + n + ': the object count is the number of names');
      ok(same(b, [String(objs.length), pfx.length ? String(pfx.length) : 'none']), 'listing lab, call ' + n + ' (prefix ' + r[0] + ', delimiter ' + r[1] + '): ' + objs.length + ' objects, ' + pfx.length + ' prefixes (got ' + b.join(' | ') + ')');
      const pfxShown = await page.$$eval('.keylist li.cp', xs => xs.map(x => x.textContent)), objShown = await page.$$eval('.keylist li:not(.cp)', xs => xs.map(x => x.textContent));
      ok(same(objShown, objs) && same(pfxShown, pfx), 'listing lab, call ' + n + ': the lists on the page are the recorded names');
    }

    // signed URL lab: the four things you can do to a URL, and the recorded answers
    const SG = await counts('gcs.signed'), sg = scene('signed');
    await go(sg.id + ':0');
    ok(same(await bigs(), [SG.expires_seconds + ' s', String(SG.signature_hex_chars), 'no']) && SG.expires_seconds === 900 && SG.signature_hex_chars === 512 && SG.network_used === false, 'signed URL lab: 900 s, 512 hex characters, made with no network');
    await go(sg.id + ':1'); await reset('sg', { c: 'nothing' });
    for (const [c, want] of [['nothing', 'valid'], ['name', 'refused'], ['expiry', 'refused'], ['late', 'refused']]) {
      await pick('sg-c', c);
      ok((await bigs())[0] === want, 'signed URL lab, "' + c + '": ' + want + ' (got ' + (await bigs())[0] + ')');
    }
    ok(SG.verified_with_public_key === true && SG.other_object_name_verifies === false && SG.longer_expiry_verifies === false, 'signed URL lab: the recorded facts behind the answers');

    // format lab: sizes next to the CSV, then the share of a Parquet file that two columns need
    const FS = await table('formats.sizes'), FC = await counts('formats.column_read'), fm = scene('format');
    await go(fm.id + ':0'); await reset('fm', { f: 'Parquet (snappy)', cols: { store_id: true, total_cents: true } });
    const csv = FS.rows.find(r => r[0] === 'CSV')[1];
    const pageText = await text();
    for (const r of FS.rows) {
      ok(close(r[1] / csv, r[2], 0, 0.0006), 'recorded format sizes: ' + r[0] + ' is ' + r[2] + ' of the CSV (' + (r[1] / csv).toFixed(4) + ')');
      ok(pageText.includes(r[0]) && pageText.includes((r[1] / 1e6).toFixed(2) + ' MB, ' + Math.round(r[1] / csv * 100) + '% of CSV'), 'format lab: the bar of ' + r[0] + ' says ' + (r[1] / 1e6).toFixed(2) + ' MB and ' + Math.round(r[1] / csv * 100) + '% of CSV');
    }
    await go(fm.id + ':1');
    const cols = Object.keys(FC.column_chunk_bytes), tot = cols.reduce((a, c) => a + FC.column_chunk_bytes[c], 0);
    ok(FC.file_bytes >= tot && FC.rows === 100000, 'recorded Parquet file: the column chunks fit inside the file');
    for (const subset of [['store_id', 'total_cents'], ['order_ts'], cols, ['order_id', 'customer_id', 'order_ts'], []]) {
      await reset('fm', { f: 'Parquet (snappy)', cols: Object.fromEntries(subset.map(c => [c, true])) });
      const got = subset.reduce((a, c) => a + FC.column_chunk_bytes[c], 0), b = await bigs();
      ok(num(b[0]) === Math.round(got / 1000) && Math.abs(num(b[1]) - got / tot * 100) <= 0.051, 'format lab, columns ' + (subset.join(', ') || 'none') + ': ' + Math.round(got / 1000) + ' KB, ' + (got / tot * 100).toFixed(1) + '% (got ' + b.join(' | ') + ')');
    }
    ok(FC.two_columns_share === Math.round((FC.column_chunk_bytes.store_id + FC.column_chunk_bytes.total_cents) / tot * 1000) / 1000, 'recorded Parquet file: the share of two columns is their bytes over the sum of the column chunks');

    // bytes lab: partitions, columns, bytes and dollars of eleven queries, then a month at three schedules
    const ES = await table('sql.estimates'), EN = await counts('sql.estimate_rules'), by = scene('bytes');
    await go(by.id + ':0'); await reset('by', { q: 0, f: 24 });
    for (let n = 0; n < ES.rows.length; n++) {
      await pick('by-q', n);
      const r = ES.rows[n], b = await bigs(), cc = /^\d+ of \d+ columns$/.test(r[1]) ? +r[1].split(' ')[0] : r[1].split(', ').length;
      ok(r[4] >= r[3] && r[4] - r[3] < 1048576 && close(r[5], r[4] / 1024 ** 4 * EN.example_price_per_tib_usd, 0, 0.00006), 'recorded estimate ' + n + ' (' + r[0] + '): billed bytes are the logical bytes rounded up, and the dollars are the bytes at 6.25 for each TiB');
      ok(b[0] === r[2] && b[1] === cc + ' of 10' && close(bytesOf(b[2]), r[4], 0.006) && close(num(b[3]), r[5], 0.003, 0.0006), 'bytes lab, query ' + n + ' (' + r[0] + '): ' + r[2] + ' partitions, ' + cc + ' columns, ' + r[4] + ' bytes (got ' + b.join(' | ') + ')');
    }
    await go(by.id + ':1');
    for (const q of [0, 1, 9]) for (const f of [1, 24, 288]) {
      await reset('by', { q, f }); const b = await bigs(), cost = ES.rows[q][5] * f * 30, narrow = ES.rows[5][5] * f * 30;
      ok(close(num(b[0]), cost, 0.006, 0.006) && close(num(b[1]), narrow, 0.006, 0.006) && Math.abs(num(b[2]) - cost / narrow) <= 0.06, 'bytes lab, query ' + q + ' at ' + f + ' runs a day: a month costs ' + cost.toFixed(2) + ' against ' + narrow.toFixed(2) + ' (got ' + b.join(' | ') + ')');
    }

    // slots lab: pure arithmetic with two example rates, all 36 settings
    const sl = scene('slots');
    await go(sl.id + ':0'); await reset('sl', { t: 100, p: 500, h: 8 });
    ok(same(await chipVals('sl-t'), ['20', '100', '400', '1500']) && same(await chipVals('sl-p'), ['100', '500', '2000']) && same(await chipVals('sl-h'), ['2', '8', '24']), 'slots lab offers 4 volumes, 3 slot counts and 3 busy-hour settings');
    for (const tb of [20, 100, 400, 1500]) for (const p of [100, 500, 2000]) for (const h of [2, 8, 24]) {
      await pick('sl-t', tb); await pick('sl-p', p); await pick('sl-h', h);
      const od = tb * 6.25, cap = p * h * 30 * 0.06, b = await bigs(), cls = await bigCls();
      ok(close(num(b[0]), od, 0.006, 0.006) && close(num(b[1]), cap, 0.006, 0.006) && num(b[2]) === Math.round(cap / 6.25) && /TiB$/.test(b[2]), 'slots lab, ' + tb + ' TiB, ' + p + ' slots, ' + h + ' hours: on demand ' + od + ', capacity ' + cap + ', equal at ' + Math.round(cap / 6.25) + ' TiB (got ' + b.join(' | ') + ')');
      ok(cls[0].includes('good') === (od < cap) && cls[1].includes('good') === (cap < od), 'slots lab, ' + tb + ' TiB, ' + p + ' slots, ' + h + ' hours: the cheaper side is marked');
    }

    // load methods lab: the wrong rows follow from what each method does with a batch that is repeated and then corrected
    const IW = await counts('idem.world'), IR = await table('idem.runs'), im = scene('idem');
    await go(im.id + ':0'); await reset('im', { m: 'merge' });
    const want = { append: [0, IW.batch_rows, IW.batch_rows], merge: [0, 0, IW.vanished], merge_and_delete: [0, 0, 0], overwrite_partition: [0, 0, 0], reload_all: [0, 0, 0] };
    ok(same(await chipVals('im-m'), Object.keys(want)), 'load methods lab offers the five methods');
    for (const m of Object.keys(want)) {
      await pick('im-m', m);
      t = (await tables())[0]; const b = await bigs();
      ok(same(t.map(r => +r[3]), want[m]), 'load methods lab, ' + m + ': wrong rows ' + want[m].join(', ') + ' (got ' + t.map(r => r[3]).join(', ') + ')');
      ok(b[0] === (want[m][1] === 0 ? 'safe' : 'not safe') && b[1] === (want[m][2] === 0 ? 'right' : String(want[m][2])), 'load methods lab, ' + m + ': the verdicts (got ' + b.join(' | ') + ')');
      ok(same(IR.rows.filter(r => r[0] === m).map(r => r[4]), want[m]), 'recorded load runs, ' + m + ': the table of the recording says the same');
    }

    // Pub/Sub lab: the recorded model, and the rules that follow from the settings
    const PM = await table('pubsub.model'), ps = scene('pubsub'), situations = [...new Set(PM.rows.map(r => r[0]))];
    await go(ps.id + ':0'); await reset('ps', null);
    ok(same(await chipVals('ps-s'), situations) && situations.length === 7, 'Pub/Sub lab offers the seven situations');
    for (const sit of situations) {
      await pick('ps-s', sit);
      t = (await tables())[0];
      ok(same(t, PM.rows.filter(r => r[0] === sit).map(r => [r[1], r[2], String(r[3]), String(r[4]), r[5]])), 'Pub/Sub lab, "' + sit + '": the rows are the recorded ones');
    }
    const pm = (sit, msg) => PM.rows.find(r => r[0] === sit && r[1] === msg);
    ok(pm('slow handler', 'm1')[3] === Math.ceil(35 / 10) && pm('slow handler', 'm1')[4] === 4 && pm('deadline long enough', 'm1')[3] === 1, 'Pub/Sub model: 35 seconds of work with a 10 second deadline is 4 deliveries, and with 60 it is 1');
    ok(pm('poison, dead letter after 5', 'm1')[3] === 5 && pm('poison, dead letter after 5', 'm1')[5] === 'dead' && pm('poison, no dead letter', 'm1')[3] === 61, 'Pub/Sub model: a dead letter after 5 stops a poison message at 5, and with none it is delivered 61 times in 60 seconds');
    ok(pm('ordering key blocks', 'a2')[3] === 0 && pm('ordering key blocks', 'a3')[3] === 0 && pm('ordering key blocks', 'b1')[5] === 'acked' && pm('ordering key, dead letter after 5', 'a3')[5] === 'acked', 'Pub/Sub model: the messages behind a poison message with the same key are held back, and the other key is not');

    // windows lab: panes against the events that were sent, and sessions merged again here
    const WL = await counts('beam.late'), wn = scene('windows');
    await go(wn.id + ':0'); await reset('wn', { c: 'late_discarding', g: 60 });
    for (const c of ['no_lateness', 'late_discarding', 'late_accumulating', 'early_late_accumulating']) {
      await pick('wn-c', c);
      const P = await table('beam.panes.' + c), L = WL[c], b = await bigs(); t = (await tables())[0];
      const acc = /accumulating/.test(c), last = {};
      P.rows.forEach(r => { last[r[0] + '|' + r[1]] = r[4]; });
      const counted = acc ? Object.values(last).reduce((a, x) => a + x, 0) : P.rows.reduce((a, r) => a + r[4], 0);
      ok(same(t.map(r => [r[0], r[1], +r[2], r[3], +r[4]]), P.rows), 'windows lab, ' + c + ': the panes on the page are the recorded panes');
      ok(counted === L.events_in_the_output && L.events_in_the_output + L.dropped === L.events_sent && L.events_sent === 6, 'recorded panes, ' + c + ': ' + (acc ? 'the last pane of each window' : 'all panes') + ' add up to the ' + L.events_in_the_output + ' events counted, and counted plus dropped is the 6 sent');
      ok(same(b, [String(L.events_sent), String(L.events_in_the_output), String(L.dropped)]) && L.dropped === (c === 'no_lateness' ? 2 : 1), 'windows lab, ' + c + ': sent, counted and dropped (got ' + b.join(' | ') + ')');
    }
    await go(wn.id + ':1');
    const merge = (times, gap) => { const out = []; times.slice().sort((a, b) => a - b).forEach(x => { const last = out[out.length - 1]; if (last && x < last.end) { last.end = x + gap; last.n++; } else out.push({ start: x, end: x + gap, n: 1 }); }); return out; };
    for (const g of [60, 10]) {
      await pick('wn-g', g);
      const want = merge([0, 20, 45, 200, 215], g), b = await bigs(); t = (await tables())[0];
      ok(b[0] === String(want.length) && same(t.map(r => [r[1], +r[2]]), want.map(x => [x.start + ' to ' + x.end, x.n])), 'windows lab, gap ' + g + ': ' + want.length + ' sessions ' + want.map(x => x.start + ' to ' + x.end + ' (' + x.n + ')').join(', ') + ' (got ' + b[0] + '; ' + t.map(r => r[1] + ' (' + r[2] + ')').join(', ') + ')');
    }

    // Spark lab: what the plan reads, the tasks of a shuffle, the files of a write, and the skew
    const SPK = await counts('spark.pruning'), SW = await counts('spark.written'), SS = await counts('spark.shuffle'), SF = await table('spark.small_files'), SK = await counts('spark.skew'), sp = scene('spark');
    await go(sp.id + ':0'); await reset('sp', { d: 'one_day', a: 'off', k: 'by_store' });
    for (const [d, folders] of [['all_days', SW.partitions], ['one_day', 1]]) {
      await pick('sp-d', d); const b = await bigs();
      ok(same(b, [String(folders), '2 of 4']) && (SPK[d].PartitionFilters === 'none') === (d === 'all_days') && SPK[d].ReadSchema === 'struct<store_id:string,total_cents:int>', 'Spark lab, ' + d + ': ' + folders + ' day folders and 2 of 4 columns (got ' + b.join(' | ') + ')');
    }
    await go(sp.id + ':1');
    for (const [a, tasks] of [['off', [200, 2]], ['on', [2, 2, 1]]]) {
      await pick('sp-a', a); const b = await bigs();
      ok(b[0] === tasks.join(', ') && b[1] === '200' && same(a === 'on' ? SS.tasks_per_stage_with_aqe : SS.tasks_per_stage_without_aqe, tasks), 'Spark lab, adaptive execution ' + a + ': tasks ' + tasks.join(', ') + ' of the 200 shuffle partitions (got ' + b.join(' | ') + ')');
    }
    t = (await tables())[0];
    ok(same(t.map(r => [r[0], +r[1]]), SF.rows.map(r => [r[0], r[1]])) && t.every(r => close(+r[1] * +r[3], +r[2], 0.02, 1)), 'Spark lab: files for each write, and files times the size of a file is the total');
    await go(sp.id + ':2');
    for (const [k, key] of [['by_store', 'by_store'], ['salt', 'by_store_and_salt']]) {
      await pick('sp-k', k); const b = await bigs(), d = SK[key];
      ok(num(b[0]) === d.largest && num(b[1]) === d.median && Math.abs(num(b[2]) - d.largest / d.median) <= 0.006 && d.largest >= d.median, 'Spark lab, ' + k + ': biggest ' + d.largest + ', median ' + d.median + ', ratio ' + (d.largest / d.median).toFixed(2) + ' (got ' + b.join(' | ') + ')');
    }
    ok(SK.by_store.largest_over_median > 3 && SK.by_store_and_salt.largest_over_median < 2, 'recorded skew: the biggest store partition is over 3 times the median, and a salt brings it under 2');

    // retries lab: every setting, with a retry loop written again here
    const dg = scene('dag');
    await go(dg.id + ':0'); await reset('dg', { r: 2, f: 2 });
    for (const r of [0, 1, 2, 3]) for (const f of [0, 1, 2, 3]) {
      await pick('dg-r', r); await pick('dg-f', f);
      let tries = 0, success = false;
      while (true) { tries++; if (tries > f) { success = true; break; } if (tries > r) break; }
      const b = await bigs(); t = (await tables())[0];
      ok(same(b, [String(tries), success ? 'success' : 'failed', success ? 'runs' : 'upstream_failed']) && same(t.map(x => x[1].startsWith('success')), Array.from({ length: tries }, (_, n) => n + 1 > f)), 'retries lab, ' + r + ' retries and ' + f + ' failures: ' + tries + ' attempts, ' + (success ? 'success' : 'failed') + ' (got ' + b.join(' | ') + ')');
    }
    const AF = await counts('af.flaky');
    ok(AF.tasks.find(x => x.task === 'extract').tries === 3 && AF.state === 'success', 'recorded Airflow run: 2 failures and 2 retries end in success on the third try');

    // change data capture lab: six changes in arrival order, applied three ways
    const cd = scene('cdc'), EV = [[1, 'o1', 'INSERT', 'NEW'], [2, 'o2', 'INSERT', 'NEW'], [4, 'o1', 'UPDATE', 'PAID'], [3, 'o1', 'UPDATE', 'PACKED'], [5, 'o2', 'DELETE', '-'], [6, 'o3', 'INSERT', 'NEW']];
    const applyAll = (ev, skipDeletes) => { const m = {}; ev.forEach(e => { if (e[2] === 'DELETE') { if (!skipDeletes) delete m[e[1]]; } else m[e[1]] = e[3]; }); return Object.keys(m).sort().map(k => [k, m[k]]); };
    const bySeq = EV.slice().sort((a, b) => a[0] - b[0]);
    await go(cd.id + ':0'); await reset('cd', { m: 'arrival' });
    const truth = applyAll(bySeq, false);
    ok(same(truth, [['o1', 'PAID'], ['o3', 'NEW']]), 'change data capture: in sequence order the source holds o1 PAID and o3 NEW');
    for (const [m, got] of [['arrival', applyAll(EV, false)], ['sequence', truth], ['nodelete', applyAll(bySeq, true)]]) {
      await pick('cd-m', m); t = await tables();
      ok(same(t[1], got) && (await bigs())[0] === (same(got, truth) ? 'matches the source' : 'wrong'), 'change data capture lab, ' + m + ': ' + JSON.stringify(got) + ' (got ' + JSON.stringify(t[1]) + ')');
    }
    ok(same(t[0].map(r => +r[1]), EV.map(e => e[0])) && same(applyAll(EV, false), [['o1', 'PACKED'], ['o3', 'NEW']]), 'change data capture lab: the arrival order puts sequence 3 after sequence 4, so o1 ends as PACKED');

    // masking lab: what each reader gets, and how many rows a row policy leaves
    const mk = scene('mask'), RP = await counts('sql.row_policy');
    await go(mk.id + ':0'); await reset('mk', { r: 'masked', p: 'off' });
    const RAW = [['order_id', '7001'], ['customer_id', 'c0042'], ['email', 'user0042@example.com'], ['phone', '+65 5550 0042'], ['birth_year', '1984']], MASKED = { email: '(a 64-character hash)', phone: 'NULL', birth_year: '0' };
    for (const r of ['fine', 'masked', 'none']) for (const p of ['off', 'on']) {
      await pick('mk-r', r); await pick('mk-p', p); t = (await tables())[0]; const b = await bigs();
      const want = RAW.map(([c, v]) => [c, MASKED[c] ? (r === 'fine' ? v : r === 'masked' ? MASKED[c] : 'access denied') : v]);
      ok(same(t.map(x => [x[0], x[2]]), want), 'masking lab, ' + r + ' reader, row policy ' + p + ': the columns (got ' + t.map(x => x[2]).join(' | ') + ')');
      ok(b[0] === (r === 'none' ? 'SELECT * fails' : 'SELECT * works') && b[1] === (p === 'on' ? RP.orders_visible_to_a_manager_of_s01 : RP.orders).toLocaleString('en-US') + ' rows', 'masking lab, ' + r + ' reader, row policy ' + p + ': ' + b.join(' | '));
    }
    ok(RP.orders === 20000 && RP.orders_visible_to_a_manager_of_s01 === 6825 && RP.stores_in_the_table === 12, 'recorded row policy: store s01 of 12 sees 6,825 of 20,000 orders');

    // split lab: the identity that links the customers on both sides to the customers in each part
    const SPL = await counts('sql.split'), WD = await counts('sql.world'), sp2 = scene('split');
    await go(sp2.id + ':0'); await reset('sp2', { k: 'order' });
    for (const [k, d, both] of [['order', SPL.by_order, SPL.customers_in_both_when_split_by_order], ['customer', SPL.by_customer, SPL.customers_in_both_when_split_by_customer]]) {
      await pick('sp2-k', k); t = (await tables())[0]; const b = await bigs();
      ok(same(t.map(r => [r[0], num(r[1]), num(r[2])]), [['train', d.train.orders, d.train.customers], ['test', d.test.orders, d.test.customers]]) && num(b[0]) === both, 'split lab, by ' + k + ': the parts and ' + both + ' customers on both sides (got ' + b.join(' | ') + ')');
      ok(d.train.customers + d.test.customers - WD.customers === both, 'recorded split, by ' + k + ': customers in train plus customers in test minus all ' + WD.customers + ' customers is the ' + both + ' on both sides');
    }
    ok(SPL.by_order.train.orders + SPL.by_order.test.orders === SPL.by_customer.train.orders + SPL.by_customer.test.orders && Math.abs(SPL.by_customer.test.customers / WD.customers - 0.2) < 0.02, 'recorded split: both splits cover the same orders, and the customer split sends about a fifth of the customers to test');

    // Terraform lab: every one of the 32 sets of fixes, against the recorded scans
    const CK = await counts('tf.checkov'), ic = scene('iac'), FIX = ['bucket', 'dataset', 'table', 'iam', 'topic'];
    await go(ic.id + ':0'); await reset('ic', { on: {} });
    ok(same(await chipVals('ic-f'), FIX) && CK.baseline.failed_count === 11 && CK.baseline.passed === 3, 'Terraform lab offers five fixes and starts from 11 failing and 3 passing');
    const clears = f => CK.baseline.failed.filter(x => !CK['fix_' + f].failed.includes(x));
    ok(FIX.reduce((a, f) => a + clears(f).length, 0) === 11 && new Set(FIX.flatMap(clears)).size === 11, 'recorded scans: the five fixes clear 11 different checks between them');
    let combos = 0;
    for (let mask = 0; mask < 32; mask++) {
      await reset('ic', { on: {} });
      const on = FIX.filter((f, n) => mask & (1 << n));
      for (const f of on) await pick('ic-f', f);
      const cleared = new Set(on.flatMap(clears)), b = await bigs(); combos++;
      ok(same(b, [String(11 - cleared.size), String(3 + cleared.size)]), 'Terraform lab, fixes {' + on.join(', ') + '}: ' + (11 - cleared.size) + ' failing, ' + (3 + cleared.size) + ' passing (got ' + b.join(' | ') + ')');
    }
    ok(combos === 32 && CK.all_fixed.failed_count === 0 && CK.all_fixed.passed === 15, 'Terraform lab: all 32 sets were tried, and the scan of the fully fixed file says 0 failing and 15 passing');
  }

  if (name === 'spark') {
    const bigs = () => page.$$eval('.lab-out .big b', els => els.map(e => e.textContent));
    const tables = () => page.$$eval('.lab .tbl', ts => ts.map(t => [...t.querySelectorAll('tbody tr')].map(r => [...r.children].map(td => td.innerText.trim()))));
    const pick = async (act, v) => { await page.click('[data-act="' + act + '"][data-v="' + v + '"]'); await page.waitForTimeout(12); };
    const press = async act => { await page.click('[data-act="' + act + '"]'); await page.waitForTimeout(12); };
    const chipVals = act => page.$$eval('[data-act="' + act + '"]', els => els.map(e => e.getAttribute('data-v')));
    const scene = kind => S.find(x => x.type === 'widget' && x.kind === kind);
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const counts = k => page.evaluate(k => LAB.real.counts[k], k);
    const table = k => page.evaluate(k => LAB.real.tables[k], k);
    const reset = (k, v) => page.evaluate(([k, v]) => { LAB.app.local[k] = v; LAB.app.render(true); }, [k, v === undefined ? null : v]).then(() => page.waitForTimeout(20));
    const fmtN = (x, d) => (Math.round(x * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
    const GIB = 1073741824, MIB = 1048576;
    const mb = n => n >= GIB ? fmtN(n / GIB, 2) + ' GiB' : n >= MIB ? fmtN(n / MIB, 1) + ' MiB' : n >= 1024 ? fmtN(n / 1024, 1) + ' KiB' : fmtN(n) + ' B';
    const bodyText = () => page.evaluate(() => document.querySelector('#stage-body').innerText);
    const widgetSteps = kind => scene(kind).n;
    let t;

    // every lab is there, with the number of steps that the lessons assume
    const KINDS = { exchange: 2, tasks: 2, joinpick: 2, skewlab: 2, memlab: 3, layoutlab: 2, ansilab: 1, udflab: 2, streamlab: 3, deltalab: 2, submitlab: 2, diagnose: 1 };
    for (const k of Object.keys(KINDS)) ok(scene(k) && widgetSteps(k) === KINDS[k], 'lab "' + k + '" exists with ' + KINDS[k] + ' step(s)');
    ok(await page.evaluate(() => LAB.config.coach.name === 'Kai' && LAB.chapters.length === 16 && LAB.config.levels.length === 16), 'the course has coach Kai, 16 missions and 16 levels');

    // shuffle counting lab: six operations, four guesses each
    const OPS = await table('parts.operations'), ex = scene('exchange');
    await go(ex.id + ':0'); await reset('ex', { op: 0, g: {} });
    ok(same(await chipVals('ex-op'), OPS.rows.map((r, n) => String(n))), 'exchange lab: one chip for each recorded operation');
    for (let n = 0; n < OPS.rows.length; n++) for (const g of [0, 1, 2, 3]) {
      await pick('ex-op', n); await pick('ex-g', g);
      const r = OPS.rows[n], b = await bigs();
      ok(same(b, [String(r[1]), String(r[2]), r[1] === g ? 'right' : 'not quite']), 'exchange lab, ' + r[0] + ', guess ' + g + ': ' + r[1] + ' exchanges, ' + r[2] + ' sorts, ' + (r[1] === g ? 'right' : 'not quite') + ' (got ' + b.join(' | ') + ')');
    }
    await go(ex.id + ':1');
    t = (await tables())[0];
    ok(same(t.map(r => r[0]), OPS.rows.map(r => r[0])) && same(t.map(r => [r[1], r[2]]), OPS.rows.map(r => [String(r[1]), String(r[2])])) && same(t.map(r => r[3]), OPS.rows.map(() => 'said 3')), 'exchange lab, the table: the six operations with the recorded exchanges and sorts, and the guesses of the last pass');
    await reset('ex', { op: 0, g: { 0: 0, 1: 1, 2: 0, 3: 1, 4: 2 } });
    t = (await tables())[0]; const b1 = await bigs();
    ok(same(t.map(r => r[3]), ['right', 'right', 'said 0', 'right', 'right', '-']) && same(b1, ['4 of 5']), 'exchange lab: the table marks right, wrong and missing guesses, and counts 4 of 5 (got ' + t.map(r => r[3]).join(', ') + ' | ' + b1.join(' | ') + ')');

    // tasks lab: input partitions, cores and waves, then the tasks after a shuffle
    const RD = await table('parts.read'), SH = await table('parts.shuffle'), tk = scene('tasks');
    await go(tk.id + ':0'); await reset('tk', { r: 0, c: 4, sh: 0 });
    for (let n = 0; n < RD.rows.length; n++) for (const c of [2, 4, 8, 16]) {
      await pick('tk-r', n); await pick('tk-c', c);
      const p = RD.rows[n][1], b = await bigs(), sq = (await page.$$('.sq')).length;
      ok(same(b, [String(p), String(Math.ceil(p / c))]) && sq === Math.min(p, 220), 'tasks lab, ' + RD.rows[n][0] + ' on ' + c + ' cores: ' + p + ' partitions, ' + Math.ceil(p / c) + ' waves, one square for each task (got ' + b.join(' | ') + ', ' + sq + ' squares)');
    }
    await go(tk.id + ':1');
    for (let n = 0; n < SH.rows.length; n++) for (const c of [2, 4, 8, 16]) {
      await pick('tk-s', n); await pick('tk-c', c);
      const r = SH.rows[n], b = await bigs();
      ok(same(b, [String(r[1]), String(r[5]), String(r[3]), String(r[4]), String(Math.ceil(r[1] / c))]), 'tasks lab, ' + r[0] + ' on ' + c + ' cores: ' + r[1] + ' tasks, ' + r[5] + ' records in all (got ' + b.join(' | ') + ')');
    }

    // join lab: every recorded situation, with the plan lines, then the adaptive plans
    const JS = await table('joins.strategies'), jp = scene('joinpick');
    await go(jp.id + ':0'); await reset('jp', { k: 0 });
    for (let n = 0; n < JS.rows.length; n++) {
      await pick('jp-k', n);
      const r = JS.rows[n], b = await bigs(), code = await page.$eval('.code-body', e => e.innerText), plan = await page.evaluate(k => LAB.real.text['joins.plan.' + k], r[0]);
      ok(same(b, [r[1], String(r[2]), String(r[3])]) && plan.split('\n').filter(l => l.trim()).every(l => code.includes(l.trim().slice(0, 40))), 'join lab, ' + r[0] + ': ' + r[1] + ', ' + r[2] + ' exchanges, ' + r[3] + ' broadcasts, with the recorded plan lines (got ' + b.join(' | ') + ')');
    }
    await go(jp.id + ':1');
    const bodyJ = await page.$$eval('.code-body', xs => xs.map(x => x.innerText)), bef = await page.evaluate(() => LAB.real.text['joins.aqe_before']), aft = await page.evaluate(() => LAB.real.text['joins.aqe_after']);
    ok(bodyJ.length === 2 && /SortMergeJoin/.test(bodyJ[0]) && /isFinalPlan=false/.test(bodyJ[0]) && /BroadcastHashJoin/.test(bodyJ[1]) && /isFinalPlan=true/.test(bodyJ[1]) && /SortMergeJoin/.test(bef) && /BroadcastHashJoin/.test(aft), 'join lab: the plan before is a sort-merge join and the final plan is a broadcast join');

    // skew lab: the numbers of both screens are on the page
    const AG = await table('skew.aggregations'), JN = await table('skew.joins'), sk = scene('skewlab');
    await go(sk.id + ':0'); let txt = await bodyText();
    ok(AG.rows.every(r => txt.includes(r[0]) && txt.includes(fmtN(+r[3])) && txt.includes(fmtN(+r[4]))), 'skew lab, aggregations: both queries with their median and busiest task');
    const bars = await page.$$eval('.gbar', xs => xs.map(x => parseFloat(x.style.width)));
    const mx = Math.max(...AG.rows.map(r => +r[4]));
    ok(bars.length === 4 && same(bars.map(x => Math.round(x * 10) / 10), [AG.rows[0][3], AG.rows[0][4], AG.rows[1][3], AG.rows[1][4]].map(v => Math.round(+v / mx * 1000) / 10)), 'skew lab: each bar is its records over the largest (got ' + bars.join(', ') + ')');
    await go(sk.id + ':1'); txt = await bodyText();
    ok(JN.rows.every(r => txt.includes(r[0]) && txt.toLowerCase().includes(r[1] + ' tasks') && txt.includes(fmtN(+r[4]))), 'skew lab, joins: the three joins with their tasks and busiest task');

    // memory lab: the formula for six heap sizes, the three storage levels, the spill
    const FM = await table('mem.formula'), LV = await table('mem.levels'), SP = await counts('mem.spill'), ml = scene('memlab');
    await go(ml.id + ':0'); await reset('ml', { h: 1, lv: 0 });
    const heaps = FM.rows.map(r => [r[1], r[2]]).concat([[4 * GIB, null], [8 * GIB, null], [16 * GIB, null]]);
    ok((await chipVals('ml-h')).length === 6, 'memory lab: three recorded and three calculated heap sizes');
    for (let n = 0; n < heaps.length; n++) {
      await pick('ml-h', n);
      const heap = heaps[n][0], un = (heap - 300 * MIB) * 0.6, us = (heap - 300 * MIB) * 0.4, b = await bigs();
      ok(same(b, [mb(heap), '300 MiB', mb(un), mb(us)]), 'memory lab, heap ' + mb(heap) + ': ' + mb(un) + ' unified and ' + mb(us) + ' user memory (got ' + b.join(' | ') + ')');
      if (heaps[n][1] !== null) ok((await bodyText()).includes(fmtN(heaps[n][1])) && Math.abs(heaps[n][1] - Math.floor(un)) <= 1, 'memory lab, heap ' + mb(heap) + ': Spark reported ' + heaps[n][1] + ' bytes, equal to the formula');
    }
    await go(ml.id + ':1');
    for (let n = 0; n < LV.rows.length; n++) {
      await pick('ml-l', n); const b = await bigs();
      ok(same(b, [mb(+LV.rows[n][1]), mb(+LV.rows[n][2])]), 'memory lab, ' + LV.rows[n][0] + ': ' + mb(+LV.rows[n][1]) + ' in memory, ' + mb(+LV.rows[n][2]) + ' on disk (got ' + b.join(' | ') + ')');
    }
    await go(ml.id + ':2');
    ok(same(await bigs(), [fmtN(SP.rows_sorted), mb(SP.memory_bytes_spilled), mb(SP.disk_bytes_spilled), fmtN(SP.memory_bytes_spilled / SP.disk_bytes_spilled, 1) + ' x']), 'memory lab, spill: the recorded bytes and the ratio');

    // file layout lab: seven ways of writing, four reads
    const VA = await table('files.variants'), RG = await table('files.rowgroups'), TO = await table('files.touched'), lo = scene('layoutlab');
    await go(lo.id + ':0'); await reset('lo', { v: 0, g: 0 });
    for (let n = 0; n < VA.rows.length; n++) {
      await pick('lo-v', n); const r = VA.rows[n], b = await bigs();
      ok(same(b, [fmtN(r[1]), fmtN(r[2]) + ' KB', fmtN(r[3], 1) + ' KB']), 'layout lab, ' + r[0] + ': ' + r[1] + ' files of ' + r[3] + ' KB (got ' + b.join(' | ') + ')');
    }
    await go(lo.id + ':1');
    for (let n = 0; n < RG.rows.length; n++) {
      await pick('lo-g', n); const r = RG.rows[n], b = await bigs();
      ok(same(b, [mb(+r[2]), fmtN(+r[3])]), 'layout lab, ' + r[0] + ', pushdown ' + r[1] + ': ' + mb(+r[2]) + ' and ' + r[3] + ' records (got ' + b.join(' | ') + ')');
    }
    t = (await tables())[0]; ok(same(t, TO.rows.map(r => r.map(String))), 'layout lab: the table of files opened by three filters is the recorded one');

    // ANSI lab: eight expressions, both modes
    const AN = await table('sql.ansi'), an = scene('ansilab');
    await go(an.id + ':0'); await reset('an', { e: 0, on: true });
    for (let n = 0; n < AN.rows.length; n++) for (const on of [true, false]) {
      await pick('an-e', n); await pick('an-m', on ? 'true' : 'false');
      const v = String(on ? AN.rows[n][1] : AN.rows[n][2]), want = /^error:/.test(v) ? 'error' : v, b = await bigs();
      ok(b[0] === want, 'ANSI lab, ' + AN.rows[n][0] + ' with ANSI ' + (on ? 'on' : 'off') + ': ' + want + ' (got ' + b[0] + ')');
      if (/^error:/.test(v)) ok((await page.$eval('.code-body', e => e.innerText)).includes(v.replace(/^error:\s*/, '').slice(0, 40)), 'ANSI lab, ' + AN.rows[n][0] + ': the message is shown');
    }

    // UDF lab: the operator of each version, the call counts of each case
    const UC = await counts('udf.calls'), ud = scene('udflab'), KS = ['Python UDF', 'Python UDF with Arrow', 'pandas UDF', 'built-in functions'];
    await go(ud.id + ':0'); await reset('ud', { k: 0, c: 0 });
    for (let n = 0; n < KS.length; n++) {
      await pick('ud-k', n); const plan = await page.evaluate(k => LAB.real.text['udf.plan.' + k], KS[n]), op = (plan.match(/BatchEvalPython|ArrowEvalPython/) || ['no Python'])[0], b = await bigs();
      ok(b[0] === op && b[1] === 'same result', 'UDF lab, ' + KS[n] + ': ' + op + ' (got ' + b.join(' | ') + ')');
    }
    await go(ud.id + ':1'); const keys = Object.keys(UC).filter(k => k !== 'rows');
    for (let n = 0; n < keys.length; n++) {
      await pick('ud-c', n); const b = await bigs();
      ok(same(b, [fmtN(UC[keys[n]]), fmtN(UC.rows), fmtN(UC[keys[n]] / UC.rows, 1) + ' x']), 'UDF lab, ' + keys[n] + ': ' + UC[keys[n]] + ' calls for ' + UC.rows + ' rows (got ' + b.join(' | ') + ')');
    }

    // streaming lab: seven batches, three modes, the restart
    const PR = await table('stream.progress'), sm = scene('streamlab'), MODES = ['update', 'append', 'complete'], RS = await counts('stream.restart');
    await go(sm.id + ':0'); await reset('sm', { b: 0, m: 0 });
    for (let n = 0; n < PR.rows.length; n++) {
      await pick('sm-b', n); const r = PR.rows[n], b = await bigs();
      ok(same(b, [String(r[1]), String(r[2]), String(r[3]), String(r[4]), String(r[5])]), 'streaming lab, batch ' + n + ': ' + r.slice(1).join(', ') + ' (got ' + b.join(' | ') + ')');
    }
    t = (await tables())[0]; ok(same(t, PR.rows.map(r => r.map(String))), 'streaming lab: the progress table is the recorded one');
    await go(sm.id + ':1');
    for (let n = 0; n < MODES.length; n++) {
      await pick('sm-m', n); const rec = await table('stream.' + MODES[n]); t = (await tables())[0];
      ok(same(t, rec.rows.map(r => r.map(String))), 'streaming lab, ' + MODES[n] + ' mode: the table of what each batch wrote is the recorded one');
    }
    await go(sm.id + ':2'); t = (await tables())[0];
    ok(same(t.map(r => r[1]), [RS.first_run_batches.join(', '), 'failed in batch 4', RS.restart_batches.join(', '), RS.batch_written_twice.join(', ')]), 'streaming lab, restart: the runs and the batch that was written twice (got ' + t.map(r => r[1]).join(' | ') + ')');

    // Delta lab: the four steps of the story, then OPTIMIZE and VACUUM
    const DB = await counts('delta.build'), DM = await counts('delta.merge'), DT = await counts('delta.time_travel'), DS = await counts('delta.small_files'), dl = scene('deltalab');
    await go(dl.id + ':0'); await reset('dt', { e: 0, f: 0, old: false, zero: false });
    await pick('dt-e', 0); ok(same(await bigs(), [fmtN(DB.rows), String(DB.parquet_files), String(DB.log_files.length)]), 'Delta lab, step 1: the rows, the Parquet files and the one commit');
    await pick('dt-e', 1); ok(same(await bigs(), [fmtN(DM.numSourceRows), fmtN(DM.numTargetRowsUpdated), fmtN(DM.numTargetRowsDeleted), fmtN(DM.numTargetRowsInserted), fmtN(DM.numOutputRows)]), 'Delta lab, step 2: the MERGE numbers');
    await pick('dt-e', 2); ok(same(await bigs(), [fmtN(DT['version 0']), fmtN(DT.latest)]), 'Delta lab, step 3: the rows of version 0 and of the latest version');
    await pick('dt-e', 3); ok(/mergeSchema/.test(await page.$eval('.code-body', e => e.innerText)), 'Delta lab, step 4: the schema message names mergeSchema');
    await go(dl.id + ':1'); await reset('dt', { e: 0, f: 0, old: false, zero: false });
    ok(same(await bigs(), [String(DS.files_in_the_version_before), String(DS.files_on_disk_before), fmtN(DS.rows_now)]), 'Delta lab: twenty appends, twenty files');
    await press('dt-vac'); ok(same(await bigs(), [String(DS.files_in_the_version_before), String(DS.files_on_disk_before), fmtN(DS.rows_now)]) && /delete \*\*nothing\*\*|delete nothing/.test(await bodyText()), 'Delta lab: a VACUUM before OPTIMIZE deletes nothing');
    await press('dt-opt'); ok(same(await bigs(), [String(DS.files_in_the_version_after_optimize), String(DS.files_on_disk_after_optimize), fmtN(DS.rows_now)]), 'Delta lab: after OPTIMIZE, one file in the version and 21 on disk');
    await press('dt-old'); ok(/Works/.test(await page.$eval('.code-box .code-body', e => e.innerText)), 'Delta lab: before VACUUM the old version can be read');
    await press('dt-vac'); ok(same(await bigs(), [String(DS.files_in_the_version_after_vacuum), String(DS.files_on_disk_after_vacuum), fmtN(DS.rows_now)]), 'Delta lab: after VACUUM, one file on disk');
    ok((await page.$$eval('.code-box .code-body', xs => xs.map(x => x.innerText))).some(x => /FILE_NOT_EXIST/.test(x)), 'Delta lab: after VACUUM the old version cannot be read');
    await press('dt-zero'); ok((await bodyText()).includes('Are you sure'), 'Delta lab: a retention of zero hours is refused');
    await press('dt-reset'); ok(same(await bigs(), [String(DS.files_in_the_version_before), String(DS.files_on_disk_before), fmtN(DS.rows_now)]), 'Delta lab: start again');

    // spark-submit lab: five ways to set a value, then the arithmetic of a size
    const PRE = await table('submit.precedence'), su = scene('submitlab');
    await go(su.id + ':0'); await reset('su', { p: 0, d: 100, e: 8, c: 4, m: 16 });
    for (let n = 0; n < PRE.rows.length; n++) { await pick('su-p', n); ok(same(await bigs(), [String(PRE.rows[n][1])]), 'submit lab, ' + PRE.rows[n][0] + ': the program saw ' + PRE.rows[n][1]); }
    await go(su.id + ':1'); let sizes = 0;
    for (const d of [10, 100, 1000]) for (const e of [2, 8, 32]) for (const c of [2, 5]) for (const m of [8, 32]) {
      await reset('su', { p: 0, d, e, c, m });
      const parts = Math.ceil(d * GIB / (128 * MIB)), cores = e * c, waves = Math.ceil(parts / cores), mem = m * GIB, over = Math.max(384 * MIB, 0.1 * mem), perCore = (mem - 300 * MIB) * 0.6 / c, b = await bigs(); sizes++;
      ok(same(b, [fmtN(parts), fmtN(cores), fmtN(waves), mb(perCore), mb(mem + over)]), 'submit lab, ' + d + ' GiB, ' + e + ' executors of ' + c + ' cores and ' + m + ' GiB: ' + parts + ' partitions, ' + waves + ' waves (got ' + b.join(' | ') + ')');
    }
    ok(sizes === 36, 'submit lab: 36 sizes were tried');

    // diagnosis lab: six runs, each with its one right answer
    const dg = scene('diagnose'), CAUSES = ['skew', 'too many tiny tasks', 'spill', 'small files', 'no pruning', 'the cache works'];
    await go(dg.id + ':0'); await reset('dg', { c: 0, g: {} });
    ok(same(await chipVals('dg-g'), CAUSES.map((x, n) => String(n))) && same(await chipVals('dg-c'), ['0', '1', '2', '3', '4', '5']), 'diagnosis lab: six runs and six causes');
    for (let n = 0; n < 6; n++) {
      await pick('dg-c', n); await pick('dg-g', (n + 1) % 6); ok(/^Not /.test(await page.$eval('.callout', e => e.innerText)), 'diagnosis lab, run ' + (n + 1) + ': a wrong answer says not that cause');
      await pick('dg-g', n); ok(/^Right: /.test(await page.$eval('.callout', e => e.innerText)) && same(await bigs(), [(n + 1) + ' of 6']), 'diagnosis lab, run ' + (n + 1) + ': the right answer is ' + CAUSES[n] + ' and the count is ' + (n + 1) + ' of 6');
    }
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
