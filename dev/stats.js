// Print the numbers a README needs: minutes per mission on each path, frame counts, and content counts.
// Run: node dev/stats.js snowflake
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const name = process.argv[2] || 'snowflake';
const root = path.join(__dirname, '..');
const cfgText = fs.readFileSync(path.join(root, name, 'js', 'config.js'), 'utf8');
const storageKey = (cfgText.match(/storageKey:\s*'([^']+)'/) || [])[1];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };
(async () => {
  const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end(); } res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(res); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const b = await chromium.launch();
  const out = {};
  for (const track of ['junior', 'senior', 'all']) {
    const page = await b.newPage();
    await page.addInitScript(([k, t]) => localStorage.setItem(k, JSON.stringify({ track: t, chosen: true })), [storageKey, track]);
    await page.goto('http://127.0.0.1:' + srv.address().port + '/' + name + '/index.html'); await page.waitForTimeout(300);
    out[track] = await page.evaluate(() => {
      const A = LAB.app, rows = [];
      LAB.chapters.forEach(ch => rows.push([ch.n, ch.title, A.missionMinutes(ch.index)]));
      const frames = +document.querySelector('#pos').textContent.match(/of (\d+)/)[1];
      return { rows, total: rows.reduce((s, r) => s + r[2], 0) };
    });
    await page.close();
  }
  const page = await b.newPage();
  await page.addInitScript(([k]) => localStorage.setItem(k, JSON.stringify({ track: 'all', chosen: true })), [storageKey]);
  await page.goto('http://127.0.0.1:' + srv.address().port + '/' + name + '/index.html'); await page.waitForTimeout(300);
  const counts = await page.evaluate(() => { const c = {}; LAB.chapters.forEach(ch => ch.scenes.forEach(s => { c[s.type] = (c[s.type] || 0) + 1; })); return c; });
  console.log('| # | Mission | Junior | Senior | Everything |\n| --- | --- | --- | --- | --- |');
  out.all.rows.forEach((r, i) => { if (r[0]) console.log('| ' + r[0] + ' | ' + r[1] + ' | ' + out.junior.rows[i][2] + ' min | ' + out.senior.rows[i][2] + ' min | ' + r[2] + ' min |'); });
  console.log('\nTotal minutes (sum of missions): junior ' + out.junior.total + ', senior ' + out.senior.total + ', everything ' + out.all.total);
  console.log('Scene counts: ' + JSON.stringify(counts));
  await b.close(); srv.close();
})();
