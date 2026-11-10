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
