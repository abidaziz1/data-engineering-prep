// Open one frame of a tutorial, optionally click things, and save a screenshot.
// Run: node dev/shot.js snowflake m2-lab:0 out.png [--click "css selector"]... [--width 1440] [--height 900] [--path all]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const a = process.argv.slice(2);
const [name, key, out] = a;
const clicks = a.reduce((acc, x, i) => (x === '--click' ? acc.concat(a[i + 1]) : acc), []);
const opt = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; };
const root = path.join(__dirname, '..');
const storageKey = (fs.readFileSync(path.join(root, name, 'js', 'config.js'), 'utf8').match(/storageKey:\s*'([^']+)'/) || [])[1];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end(); }
  res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(res);
});
srv.listen(0, '127.0.0.1', async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +opt('width', 1440), height: +opt('height', 900) } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(([k, t]) => { try { localStorage.setItem(k, JSON.stringify({ track: t, chosen: true })); } catch (e) {} }, [storageKey, opt('path', 'all')]);
  await page.goto('http://127.0.0.1:' + srv.address().port + '/' + name + '/index.html#' + key);
  await page.waitForTimeout(600);
  for (const c of clicks) { await page.click(c); await page.waitForTimeout(250); }
  await page.waitForTimeout(400);
  await page.screenshot({ path: out });
  if (errs.length) console.log('ERRORS', errs);
  await browser.close(); srv.close();
});
