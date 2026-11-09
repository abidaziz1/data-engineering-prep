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
