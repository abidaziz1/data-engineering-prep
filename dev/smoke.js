// Walk every frame of a tutorial on one path and report: console errors, failed requests,
// horizontal overflow, text below the size thresholds, and stray "undefined" / "NaN".
// Run: node dev/smoke.js snowflake [--path all] [--width 1440] [--height 900] [--file] [--shots dir] [--ids a,b]
//   --file   open via file:// (default is a local http server, which also proves relative paths)
//   --shots  save a screenshot of every frame whose scene id is in --ids (or every frame if no --ids)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const args = process.argv.slice(2);
const name = args.find((a, i) => !a.startsWith('--') && (i === 0 || !args[i - 1].startsWith('--') || args[i - 1] === '--file')) || 'snowflake';
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const flag = k => args.includes('--' + k);
const W = +opt('width', 1440), H = +opt('height', 900), pathId = opt('path', 'all');
const shotsDir = opt('shots', ''), shotIds = (opt('ids', '') || '').split(',').filter(Boolean);
const root = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(root, name, 'js', 'config.js'), 'utf8');
const storageKey = (cfg.match(/storageKey:\s*'([^']+)'/) || [])[1];

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.json': 'application/json' };
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream');
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

(async () => {
  const srv = flag('file') ? null : await serve();
  const url = flag('file') ? require('url').pathToFileURL(path.join(root, name, 'index.html')).href : 'http://127.0.0.1:' + srv.address().port + '/' + name + '/index.html';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [], failed = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('requestfailed', r => failed.push(r.url()));
  page.on('response', r => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()); });
  await page.addInitScript(([k, t]) => { try { localStorage.setItem(k, JSON.stringify({ track: t, chosen: true })); } catch (e) {} }, [storageKey, pathId]);
  await page.goto(url); await page.waitForTimeout(500);
  if (shotsDir) fs.mkdirSync(shotsDir, { recursive: true });

  const small = {}, overflow = [], stray = [];
  let n = 0;
  for (let g = 0; g < 1500; g++) {
    const res = await page.evaluate(() => {
      const out = [];
      const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; };
      document.querySelectorAll('body *').forEach(el => {
        if (el.closest('svg')) return;
        const own = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
        if (!own || !vis(el)) return;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs < 15) out.push([el.tagName.toLowerCase() + '.' + (el.className && el.className.baseVal === undefined ? String(el.className).split(' ').join('.') : ''), fs, el.textContent.trim().slice(0, 30)]);
      });
      document.querySelectorAll('svg.graph text').forEach(t => {
        if (!t.textContent.trim() || !vis(t) || t.closest('.dim,.hide')) return;
        const svg = t.ownerSVGElement; const vb = svg.viewBox.baseVal; const scale = svg.getBoundingClientRect().width / vb.width;
        const fs = parseFloat(getComputedStyle(t).fontSize) * scale;
        if (fs < 14) out.push(['svg.' + t.getAttribute('class'), Math.round(fs * 10) / 10, t.textContent.trim().slice(0, 30)]);
      });
      const de = document.documentElement;
      const txt = document.body.innerText;
      const bad = txt.match(/\bundefined\b|\bNaN\b|\[object Object\]/);
      let svgOut = false;
      document.querySelectorAll('svg.graph').forEach(s => { const r = s.getBoundingClientRect(); if (r.right > de.clientWidth + 1) svgOut = true; });
      return { out, label: document.querySelector('#next-label').textContent, overflow: de.scrollWidth > de.clientWidth + 1 || svgOut, bad: bad && bad[0], key: (window.LAB && LAB.app && LAB.app.state.frame) || '' };
    });
    n++;
    res.out.forEach(([k, fs, t]) => { const key = k + ' @' + fs.toFixed(1); (small[key] = small[key] || { n: 0, ex: t, at: res.key }).n++; });
    if (res.overflow) overflow.push(res.key);
    if (res.bad) stray.push(res.key + ' -> ' + res.bad);
    if (shotsDir && (!shotIds.length || shotIds.includes(res.key.split(':')[0]))) await page.screenshot({ path: path.join(shotsDir, res.key.replace(/[^A-Za-z0-9_.-]/g, '_') + '.png') });
    if (res.label === 'Finish') break;
    await page.click('#next'); await page.waitForTimeout(20);
  }
  console.log('viewport ' + W + 'x' + H + ', path ' + pathId + ', frames walked: ' + n);
  console.log(errors.length ? 'ERRORS:\n  ' + [...new Set(errors)].join('\n  ') : 'no console errors');
  console.log(failed.length ? 'FAILED REQUESTS:\n  ' + [...new Set(failed)].join('\n  ') : 'no failed requests');
  console.log(overflow.length ? 'HORIZONTAL OVERFLOW at: ' + overflow.join(', ') : 'no horizontal overflow');
  console.log(stray.length ? 'STRAY TEXT:\n  ' + stray.join('\n  ') : 'no stray undefined / NaN text');
  const keys = Object.keys(small);
  if (keys.length) { console.log('SMALL TEXT:'); keys.sort((a, b) => small[b].n - small[a].n).forEach(k => console.log('  ' + String(small[k].n).padStart(4), k, ' e.g.', JSON.stringify(small[k].ex), 'at', small[k].at)); }
  else console.log('no text below the thresholds');
  await browser.close();
  if (srv) srv.close();
  process.exit(errors.length || failed.length || overflow.length || stray.length || keys.length ? 1 : 0);
})();
