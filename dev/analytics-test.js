// Checks shared/js/analytics.js against a stub of the GoatCounter script. Nothing leaves the machine.
// Run: node dev/analytics-test.js
// Optional targeted pass: ANALYTICS_TEST_COURSES=aws node dev/analytics-test.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const same = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')');

const STUB = 'window.goatcounter = { get_data: function(o) { return { p:o.path, t:o.title, e:!!o.event, q:location.search, r:document.referrer }; }, count: function (o) { this.get_data(o); (window.__hits = window.__hits || []).push(o); } };';

(async () => {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end(); }
    res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port;
  const browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {});

  // a new page with its own storage; opts.cfg is window.LAB_ANALYTICS, opts.state is the saved tutorial state, opts.dnt turns Do Not Track on
  async function open(url, opts = {}) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const requests = [];
    page.on('request', r => { if (/gc\.zgo\.at|goatcounter\.com/.test(r.url())) requests.push(r.url()); });
    await page.route(/https:\/\/[^/]*goatcounter\.com\//, r => r.abort());
    await page.route('https://gc.zgo.at/count.js', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(o => {
      if (o.cfg) window.LAB_ANALYTICS = o.cfg;
      if (o.dnt) Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' });
      if (o.state) { try { localStorage.setItem(o.state[0], JSON.stringify(o.state[1])); } catch (e) { /* ignore */ } }
    }, opts);
    await page.goto(base + url);
    await page.waitForTimeout(500);
    const hits = () => page.evaluate(() => (window.__hits || []).map(h => ({ path: h.path, title: h.title, event: !!h.event, keys: Object.keys(h).sort().join(',') })));
    return { page, ctx, requests, errs, hits };
  }
  const cfg = { code: 'test-site', force: true };
  const awsState = ['dep.aws.v1', { track: 'all', chosen: true }];

  // 1. the hub: one page view, the notice in the footer, the script is wired to the right counter
  {
    const t = await open('/index.html', { cfg });
    const h = await t.hits();
    same(h.filter(x => !x.event).map(x => [x.path, x.event]), [['/', false]], 'hub: one page view');
    ok(h.some(x => x.path === 'hub/course-opened' && x.event), 'hub: one aggregate library-open event');
    ok(await t.page.evaluate(() => /counts visits.*GoatCounter/.test(document.querySelector('body > footer').textContent)), 'hub: footer says visits are counted');
    const attr = await t.page.evaluate(() => { const s = document.querySelector('script[src="https://gc.zgo.at/count.js"]'); return s && [s.getAttribute('data-goatcounter'), s.getAttribute('data-goatcounter-settings')]; });
    same(attr, ['https://test-site.goatcounter.com/count', '{"no_onload":true}'], 'hub: script settings');
    same(t.errs, [], 'hub: no page errors');
    await t.ctx.close();
  }

  // 2. a tutorial: page view, path, first mission; no repeats inside a visit; a new mission adds one event
  for (const name of ['ai', 'airflow', 'aws', 'azure', 'bi', 'databricks', 'dbt', 'docker', 'fabric', 'flink', 'gcp', 'git', 'ingestion', 'java', 'kafka', 'kubernetes', 'mongodb', 'postgresql', 'project-cdc', 'project-elt', 'project-lakehouse', 'python', 'scala', 'snowflake', 'snowflake-dbt', 'spark', 'sql'].filter(name => !process.env.ANALYTICS_TEST_COURSES || process.env.ANALYTICS_TEST_COURSES.split(',').includes(name))) {
    const stateKey = (fs.readFileSync(path.join(root, name, 'js', 'config.js'), 'utf8').match(/storageKey:\s*'([^']+)'/) || [])[1];
    const widest = await (async () => { const t = await open('/' + name + '/index.html', { cfg: null }); const w = await t.page.evaluate(() => LAB.config.tracks ? LAB.config.tracks[LAB.config.tracks.length - 1].id : 'all'); await t.ctx.close(); return w; })();
    const t = await open('/' + name + '/index.html#m1.0:0', { cfg, state: [stateKey, { track: widest, chosen: true }] });
    let h = await t.hits();
    ok(h.some(x => x.path === '/' + name + '/' && !x.event), name + ': page view of /' + name + '/');
    ok(h.some(x => x.event && x.path === name + '/path-' + widest), name + ': path event');
    const missions = h.filter(x => x.event && x.path.indexOf(name + '/mission-') === 0 && /\/mission-\d\d$/.test(x.path)).map(x => x.path);
    same(missions.length, 1, name + ': one mission event at the start');
    for (let i = 0; i < 4; i++) { await t.page.click('#next'); await t.page.waitForTimeout(60); }
    h = await t.hits();
    same(h.filter(x => x.event && x.path.indexOf(name + '/mission-') === 0 && /\/mission-\d\d$/.test(x.path)).length, 1, name + ': Next inside a mission adds nothing');
    same(h.every(x => ['path,title', 'event,path,title'].includes(x.keys)), true, name + ': hits carry only path, title and event');
    // jump to another mission by its first frame
    const other = await t.page.evaluate(() => { const c = LAB.chapters[2]; return c.scenes[0].id + ':0'; });
    await t.page.evaluate(k => { location.hash = k; }, other);
    await t.page.waitForTimeout(200);
    h = await t.hits();
    const m2 = h.filter(x => x.event && x.path.indexOf(name + '/mission-') === 0 && /\/mission-\d\d$/.test(x.path)).map(x => x.path);
    same(m2.length, 2, name + ': a second mission adds one event');
    same(new Set(m2).size, 2, name + ': the two mission events differ');
    same(t.errs, [], name + ': no page errors');
    await t.ctx.close();
  }

  // 3. choosing a path on the welcome screen, then pressing Finish on the last step
  {
    const t = await open('/aws/index.html', { cfg });
    let h = await t.hits();
    ok(!h.some(x => /path-/.test(x.path)), 'aws: no path event before a path is chosen');
    await t.page.click('[data-t="junior"]').catch(() => {});
    await t.page.waitForTimeout(200);
    const tracks = await t.page.evaluate(() => (LAB.config.tracks || []).map(x => x.id));
    h = await t.hits();
    ok(tracks.length === 0 || h.some(x => x.event && /aws\/path-/.test(x.path)), 'aws: a path event after the visitor chooses a path');
    await t.page.evaluate(() => {
      const c = LAB.chapters[LAB.chapters.length - 1], s = c.scenes[c.scenes.length - 1];
      location.hash = s.id + ':' + (LAB.R[s.type].steps(s) - 1);
    });
    await t.page.waitForTimeout(200);
    await t.page.evaluate(() => { LAB.app.setTrack((LAB.config.tracks || [{ id: 'all' }]).slice(-1)[0].id); });
    await t.page.evaluate(() => {
      const c = LAB.chapters[LAB.chapters.length - 1], s = c.scenes[c.scenes.length - 1];
      location.hash = s.id + ':' + (LAB.R[s.type].steps(s) - 1);
    });
    await t.page.waitForTimeout(200);
    same(await t.page.textContent('#next-label'), 'Finish', 'aws: the last step says Finish');
    await t.page.click('#next');
    await t.page.waitForTimeout(150);
    h = await t.hits();
    same(h.filter(x => x.path === 'aws/finished').length, 1, 'aws: one finished event');
    await t.page.evaluate(() => document.querySelector('#next').click());
    h = await t.hits();
    same(h.filter(x => x.path === 'aws/finished').length, 1, 'aws: finished is sent once per visit');
    await t.ctx.close();
  }

  // 4. off by default: no code, no request, no hits, and the app still works
  {
    const t = await open('/aws/index.html#m2-list-lab:0', { cfg: null, state: awsState });
    same(t.requests, [], 'off: no request to GoatCounter');
    same(await t.hits(), [], 'off: no hits');
    same(await t.page.evaluate(() => LAB.analytics.active), false, 'off: analytics.active is false');
    same(await t.page.evaluate(() => document.querySelector('#stage-title').textContent.length > 0), true, 'off: the lesson renders');
    await t.ctx.close();
  }

  // 5. localhost is skipped unless forced
  {
    const t = await open('/aws/index.html#m2-list-lab:0', { cfg: { code: 'test-site' }, state: awsState });
    same(t.requests, [], 'localhost: no request');
    await t.ctx.close();
  }

  // 6. a bad code is refused, so nothing is built into a URL
  {
    const t = await open('/aws/index.html', { cfg: { code: 'a/b?c', force: true }, state: awsState });
    same(t.requests, [], 'bad code: no request');
    await t.ctx.close();
  }

  // 7. Do Not Track
  {
    const t = await open('/aws/index.html#m2-list-lab:0', { cfg, state: awsState, dnt: true });
    same(t.requests, [], 'Do Not Track: no request');
    await t.ctx.close();
  }

  // 8. ?notrack=1 sticks, ?notrack=0 undoes it
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.route(/https:\/\/[^/]*goatcounter\.com\//, r => r.abort());
    await page.route('https://gc.zgo.at/count.js', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
    await page.addInitScript(() => { window.LAB_ANALYTICS = { code: 'test-site', force: true }; });
    const count = async url => { await page.goto(base + url); await page.waitForTimeout(300); return page.evaluate(() => (window.__hits || []).length); };
    ok((await count('/aws/index.html')) > 0, 'notrack: counted at first');
    same(await count('/aws/index.html?notrack=1'), 0, 'notrack=1: nothing counted');
    same(await count('/aws/index.html'), 0, 'notrack: still nothing on the next visit');
    ok((await count('/aws/index.html?notrack=0')) > 0, 'notrack=0: counting is back');
    await ctx.close();
  }

  // 9. Real shared-engine controls emit categories, not choices or learner data.
  {
    const t = await open('/aws/index.html', { cfg, state: awsState });
    async function jump(type, step = 0, needsResult = false) {
      const id = await t.page.evaluate(({type, needsResult}) => {
        const s = LAB.chapters.flatMap(c => c.scenes).find(s => s.type === type && (!needsResult || s.result));
        if (!s) return null;
        LAB.app.goScene(s.id);
        return s.id;
      }, { type, needsResult });
      ok(!!id, 'integration: sample scene exists for ' + type);
      for (let n = 0; n < step; n++) await t.page.click('#next');
      return id;
    }
    async function used(kind) {
      const h = await t.hits();
      same(h.filter(x => x.path === 'aws/interaction-' + kind).length, 1, 'integration: ' + kind + ' hook fires once');
    }
    await jump('quiz'); await t.page.click('#stage-body .opt[data-k] >> nth=0'); await used('quiz');
    await jump('bug'); await t.page.click('#stage-body .ln.clk[data-n] >> nth=0'); await used('bug');
    await jump('order'); await t.page.click('#stage-body .chip-btn[data-o] >> nth=0'); await used('order');
    await jump('decide'); await t.page.click('#stage-body .dopt[data-k] >> nth=0'); await used('decision');
    await jump('widget'); await t.page.click('#stage-body button[data-act] >> nth=0'); await used('lab');
    await jump('code'); await t.page.click('#stage-body [data-act="copy"] >> nth=0'); await used('code-copy');
    await jump('challenge'); await t.page.click('#stage-body [data-c="hint"]'); await used('challenge-hint');
    await t.page.click('#stage-body [data-c="sol"]'); await used('challenge-solution');
    await jump('qa'); await t.page.click('#stage-body [data-q="timer"]'); await used('interview-timer');
    await t.page.click('#next'); await used('interview-answer');
    await t.page.click('#next'); await t.page.click('#stage-body .fu > summary >> nth=0'); await used('interview-followup');
    // Snowflake has executable-result walkthroughs; AWS uses recorded row/code panels.
    const sfKey = (fs.readFileSync(path.join(root, 'snowflake/js/config.js'), 'utf8').match(/storageKey:\s*'([^']+)'/) || [])[1];
    const sql = await open('/snowflake/index.html', { cfg, state: [sfKey, { track: 'all', chosen: true }] });
    const sqlId = await sql.page.evaluate(() => {
      const s = LAB.chapters.flatMap(c => c.scenes).find(s => s.type === 'sql' && s.result);
      if (!s) return null;
      LAB.app.goScene(s.id); return s.id;
    });
    ok(!!sqlId, 'integration: Snowflake SQL result scene exists');
    await sql.page.click('#stage-body [data-act="run"]');
    same((await sql.hits()).filter(h => h.path === 'snowflake/interaction-sql-run').length, 1, 'integration: actual SQL Run control is counted');
    same(sql.errs, [], 'integration: SQL result control stays error-free');
    await sql.ctx.close();
    await jump('score'); await t.page.click('#stage-body [data-go] >> nth=0'); await used('interview-review');
    // A map jump alone reaches a final frame; only Next crosses the mission boundary.
    const end = await t.page.evaluate(() => {
      const ch = LAB.chapters.find(c => c.n === 2);
      const scenes = ch.scenes.filter(s => s.t <= 3), last = scenes[scenes.length - 1];
      LAB.app.goScene(last.id);
      for (let n = 1; n < LAB.R[last.type].steps(last); n++) document.querySelector('#next').click();
      return 'aws/mission-end-02';
    });
    ok(!(await t.hits()).some(h => h.path === end), 'integration: jumping to final mission frame is not mission-end action');
    await t.page.click('#next');
    same((await t.hits()).filter(h => h.path === end).length, 1, 'integration: Next past final frame emits mission end');
    const h = await t.hits();
    ok(h.some(x => x.path === 'aws/progress-25'), 'integration: real frame metadata emits navigation depth');
    ok(h.every(x => !/answer=|grade=|PRIVATE_ANSWER/.test(JSON.stringify(x))), 'integration: category transport excludes learner data');
    const previous = await t.page.evaluate(() => LAB.app.state.frame);
    await t.page.evaluate(() => {
      ['frame','interaction','missionComplete','finished','path'].forEach(k => { LAB.analytics[k] = function () { throw new Error('broken optional analytics'); }; });
    });
    await t.page.click('#next');
    ok(await t.page.evaluate(old => LAB.app.state.frame !== old, previous), 'integration: navigation survives a broken optional analytics API');
    await t.page.evaluate(() => LAB.app.setTrack('junior'));
    same(await t.page.evaluate(() => LAB.app.state.track), 'junior', 'integration: path switching survives analytics exceptions');
    same(t.errs, [], 'integration: all shared control hooks keep lesson error-free');
    await t.ctx.close();
  }

  await browser.close(); srv.close();
  console.log(pass + ' checks passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
