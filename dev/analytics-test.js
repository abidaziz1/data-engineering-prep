// Checks shared/js/analytics.js against a stub of the GoatCounter script. Nothing leaves the machine.
// Run: node dev/analytics-test.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const same = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')');

const STUB = 'window.goatcounter = { count: function (o) { (window.__hits = window.__hits || []).push(o); } };';

(async () => {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end(); }
    res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port;
  const browser = await chromium.launch();

  // a new page with its own storage; opts.cfg is window.LAB_ANALYTICS, opts.state is the saved tutorial state, opts.dnt turns Do Not Track on
  async function open(url, opts = {}) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const requests = [];
    page.on('request', r => { if (/gc\.zgo\.at|goatcounter\.com/.test(r.url())) requests.push(r.url()); });
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
    same(h.map(x => [x.path, x.event]), [['/', false]], 'hub: one page view');
    ok(await t.page.evaluate(() => /counts visits with GoatCounter/.test(document.querySelector('body > footer').textContent)), 'hub: footer says visits are counted');
    const attr = await t.page.evaluate(() => { const s = document.querySelector('script[src="https://gc.zgo.at/count.js"]'); return s && [s.getAttribute('data-goatcounter'), s.getAttribute('data-goatcounter-settings')]; });
    same(attr, ['https://test-site.goatcounter.com/count', '{"no_onload":true}'], 'hub: script settings');
    same(t.errs, [], 'hub: no page errors');
    await t.ctx.close();
  }

  // 2. a tutorial: page view, path, first mission; no repeats inside a visit; a new mission adds one event
  for (const name of ['ai', 'airflow', 'aws', 'azure', 'databricks', 'dbt', 'flink', 'gcp', 'kafka', 'python', 'snowflake', 'snowflake-dbt', 'spark', 'sql']) {
    const stateKey = (fs.readFileSync(path.join(root, name, 'js', 'config.js'), 'utf8').match(/storageKey:\s*'([^']+)'/) || [])[1];
    const widest = await (async () => { const t = await open('/' + name + '/index.html', { cfg: null }); const w = await t.page.evaluate(() => LAB.config.tracks ? LAB.config.tracks[LAB.config.tracks.length - 1].id : 'all'); await t.ctx.close(); return w; })();
    const t = await open('/' + name + '/index.html#m1.0:0', { cfg, state: [stateKey, { track: widest, chosen: true }] });
    let h = await t.hits();
    ok(h.some(x => x.path === '/' + name + '/' && !x.event), name + ': page view of /' + name + '/');
    ok(h.some(x => x.event && x.path === name + '/path-' + widest), name + ': path event');
    const missions = h.filter(x => x.event && /\/mission-\d\d$/.test(x.path)).map(x => x.path);
    same(missions.length, 1, name + ': one mission event at the start');
    for (let i = 0; i < 4; i++) { await t.page.click('#next'); await t.page.waitForTimeout(60); }
    h = await t.hits();
    same(h.filter(x => x.event && /\/mission-\d\d$/.test(x.path)).length, 1, name + ': Next inside a mission adds nothing');
    same(h.every(x => ['path,title', 'event,path,title'].includes(x.keys)), true, name + ': hits carry only path, title and event');
    // jump to another mission by its first frame
    const other = await t.page.evaluate(() => { const c = LAB.chapters[2]; return c.scenes[0].id + ':0'; });
    await t.page.evaluate(k => { location.hash = k; }, other);
    await t.page.waitForTimeout(200);
    h = await t.hits();
    const m2 = h.filter(x => x.event && /\/mission-\d\d$/.test(x.path)).map(x => x.path);
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
    await t.page.click('#next').catch(() => {});
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
    await page.route('https://gc.zgo.at/count.js', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
    await page.addInitScript(() => { window.LAB_ANALYTICS = { code: 'test-site', force: true }; });
    const count = async url => { await page.goto(base + url); await page.waitForTimeout(300); return page.evaluate(() => (window.__hits || []).length); };
    ok((await count('/aws/index.html')) > 0, 'notrack: counted at first');
    same(await count('/aws/index.html?notrack=1'), 0, 'notrack=1: nothing counted');
    same(await count('/aws/index.html'), 0, 'notrack: still nothing on the next visit');
    ok((await count('/aws/index.html?notrack=0')) > 0, 'notrack=0: counting is back');
    await ctx.close();
  }

  await browser.close(); srv.close();
  console.log(pass + ' checks passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
