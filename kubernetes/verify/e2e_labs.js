// End-to-end test of the 6 labs of the Kubernetes course, in a real browser.
// It opens kubernetes/index.html, clicks every chip of every lab, and compares what the page shows with
//   (a) what was recorded (kubernetes/js/real.js), and
//   (b) values that are worked out in this file (the limits of a rolling update, what a Job makes, what each delete removes).
// Nothing is read from the widget code. A lab that shows a wrong number or a stale label fails here, even when the data behind it passes
// verify/check_widgets.js. No step may show an HTML tag, backticks, asterisks, "undefined" or "NaN" as text.
// Needs Playwright:  npm install playwright && npx playwright install chromium
// Run: node kubernetes/verify/e2e_labs.js
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
  await page.addInitScript(() => { try { localStorage.setItem('dep.kubernetes.v1', JSON.stringify({ track: 'all', chosen: true })); } catch (e) { /* ignore */ } });
  await page.goto('http://127.0.0.1:' + srv.address().port + '/kubernetes/index.html'); await page.waitForTimeout(300);

  const REAL = await page.evaluate(() => LAB.real), C = k => REAL.counts[k], T = k => REAL.tables[k], X = k => REAL.text[k], F = k => REAL.files[k];
  const sceneOf = kind => page.evaluate(k => { let f = null; LAB.chapters.forEach(c => c.scenes.forEach(s => { if (s.type === 'widget' && s.kind === k) f = s.id; })); return f; }, kind);
  const open = async kind => { const id = await sceneOf(kind); ok(!!id, 'the course has a lab of kind ' + kind); await page.evaluate(k => { location.hash = k + ':0'; }, id); await page.waitForTimeout(60); };
  const pick = async (act, v) => { await page.click('[data-act="' + act + '"][data-v="' + v + '"]'); await page.waitForTimeout(12); };
  const bigs = () => page.$$eval('.lab .big', els => els.map(e => [e.querySelector('b').textContent, e.querySelector('span').textContent, e.className.replace('big', '').trim()]));
  const tables = () => page.$$eval('.lab .tbl', ts => ts.map(t => [...t.querySelectorAll('tbody tr')].map(r => [...r.children].map(td => td.innerText.trim()))));
  const rowClasses = () => page.$$eval('.lab .tbl tbody tr', rs => rs.map(r => r.className));
  const chipOn = act => page.$$eval('[data-act="' + act + '"].on', els => els.map(e => e.getAttribute('data-v')));
  const chipVals = act => page.$$eval('[data-act="' + act + '"]', els => els.map(e => e.getAttribute('data-v')));
  const callouts = () => page.$$eval('.lab .callout', els => els.map(e => [e.className.replace('callout', '').trim(), e.innerText.replace(/\s+/g, ' ').trim()]));
  const lanes = () => page.$$eval('.lab .lane', els => els.map(l => [l.querySelector('.lane-n').textContent, l.querySelector('.lane-v').textContent, l.querySelector('i').className]));
  const codes = () => page.$$eval('.lab pre', els => els.map(e => e.innerText.trim()));
  const noRaw = async where => { const t = await page.$eval('.lab', el => el.innerText); ok(!/[`]|\*\*|<\/?[a-z][a-z0-9]*[ >]|undefined|NaN|\[object Object\]/.test(t), where + ' shows no raw markup, undefined or NaN: ' + (t.match(/.{0,30}([`]|\*\*|<\/?[a-z][a-z0-9]*[ >]|undefined|NaN|\[object Object\]).{0,30}/) || [''])[0]); };
  const section = async (name, fn) => { try { await fn(); } catch (e) { fail++; console.log('FAIL:', name, 'threw', String(e.message).split('\n')[0]); } };
  const norm = s => s.replace(/\s+/g, ' ').replace(/`/g, '').trim();

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 1: four pods that fail
  await section('fail lab', async () => {
    await open('fail');
    eq(await chipVals('fl-k'), ['badimage', 'crash', 'oom', 'pending'], 'fail lab: four pods');
    const want = {
      badimage: { file: 'pod-badimage.yaml', shows: C('fail.badimage').seen.join(', then '), has: [X('fail.badimage_message')] },
      crash: { file: 'pod-crash.yaml', shows: C('fail.crash').seen.join(', then '), has: [X('fail.crash_logs'), 'exited with code ' + C('fail.crash').last_exit_code, C('fail.crash').restart_times_s.join(', ')], code: 'exit code ' + C('fail.crash').last_exit_code },
      oom: { file: 'pod-oom.yaml', shows: 'OOMKilled', has: [C('fail.oom').limit, C('fail.oom').reason, String(C('fail.oom').exit_code)], code: 'exit code ' + C('fail.oom').exit_code },
      pending: { file: 'pod-pending.yaml', shows: C('fail.pending').status, has: ['64 CPUs', String(C('fail.pending').node_cpus), 'Insufficient cpu'] }
    };
    for (const k of Object.keys(want)) {
      await pick('fl-k', k);
      eq(await chipOn('fl-k'), [k], 'fail lab: ' + k + ' is selected');
      eq((await codes())[0], F(want[k].file).trim(), 'fail lab, ' + k + ': the manifest on the screen is ' + want[k].file);
      const b = await bigs();
      eq(b[0][0], want[k].shows, 'fail lab, ' + k + ': what kubectl showed');
      if (want[k].code) eq(b[1][0], want[k].code, 'fail lab, ' + k + ': the last thing the container did');
      const all = (await callouts()).map(c => c[1]).join(' ');
      want[k].has.forEach(h => ok(all.indexOf(h) >= 0, 'fail lab, ' + k + ': the text names "' + h + '"'));
      await noRaw('fail lab, ' + k);
    }
  });

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 2: a rolling update. The limits of the controller: pods in all <= replicas + maxSurge, pods ready >= replicas - maxUnavailable.
  await section('roll lab', async () => {
    await open('roll');
    eq(await chipVals('ro-k'), ['1/0', '0/1', '1/1'], 'roll lab: three pairs');
    const N = 3, RO = C('deploy.rolling');
    for (const [pair, surge, unavail] of [['1/0', 1, 0], ['0/1', 0, 1], ['1/1', 1, 1]]) {
      await pick('ro-k', pair);
      eq(await chipOn('ro-k'), [pair], 'roll lab: ' + pair + ' is selected');
      const t = (await tables())[0], b = await bigs();
      ok(t.length >= 3, 'roll lab ' + pair + ': the update has steps');
      eq(t[0].slice(1).map(Number), [N, 0, 0, N, N], 'roll lab ' + pair + ': it starts with ' + N + ' old pods');
      const last = t[t.length - 1].map(Number);
      eq([last[1], last[2], last[3]], [0, N, 0], 'roll lab ' + pair + ': it ends with no old pods and ' + N + ' new ready pods');
      t.forEach((r, i) => { const [step, old, rdy, starting, all, ready] = r.map(Number); ok(step === i && all === old + rdy + starting && ready === old + rdy, 'roll lab ' + pair + ': row ' + i + ' adds up'); ok(all <= N + surge, 'roll lab ' + pair + ': row ' + i + ' has at most replicas + maxSurge pods'); ok(i === 0 || ready >= N - unavail, 'roll lab ' + pair + ': row ' + i + ' has at least replicas - maxUnavailable ready pods'); });
      const peak = Math.max(...t.map(r => +r[4])), low = Math.min(...t.map(r => +r[5]));
      eq([peak, low], [N + surge, N - unavail], 'roll lab ' + pair + ': most pods and fewest ready');
      eq([b[0][0], b[1][0], b[2][0]], [String(peak), String(low), String(last[0])], 'roll lab ' + pair + ': the three numbers');
      const text = await page.$eval('.lab .lab-note', e => e.innerText);
      if (surge === RO.surge && unavail === RO.max_unavailable) { ok(text.indexOf('at most ' + RO.max_pods_seen + ' pods') >= 0 && text.indexOf('fewer than ' + RO.min_ready_seen) >= 0, 'roll lab ' + pair + ': the recorded numbers are quoted'); eq([peak, low], [RO.max_pods_seen, RO.min_ready_seen], 'roll lab ' + pair + ': the worked-out peak and lowest equal the recorded ones'); }
      else ok(/not run/.test(text), 'roll lab ' + pair + ': says that this pair was not run');
      await noRaw('roll lab ' + pair);
    }
  });

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 3: three Services
  await section('service lab', async () => {
    await open('svc');
    eq(await chipVals('sv-k'), ['web', 'web-wrong', 'web-port'], 'service lab: three Services');
    const want = { web: { file: 'svc-web.yaml', ep: C('svc.endpoints').addresses + ' addresses', res: X('svc.short'), good: true }, 'web-wrong': { file: 'svc-web-wrong.yaml', ep: 'none', res: X('svc.wrong_wget'), good: false }, 'web-port': { file: 'svc-web-port.yaml', ep: 'port ' + X('svc.port_endpoint'), res: X('svc.port_wget'), good: false } };
    for (const k of Object.keys(want)) {
      await pick('sv-k', k);
      eq(await chipOn('sv-k'), [k], 'service lab: ' + k + ' is selected');
      const c = await codes();
      eq(c[0], F(want[k].file).trim(), 'service lab, ' + k + ': the manifest');
      eq(c[1], '$ wget -qO- -T 3 http://' + k + ':8080\n' + want[k].res, 'service lab, ' + k + ': the call and its answer');
      const b = await bigs();
      ok(b[0][0].indexOf(want[k].ep) >= 0, 'service lab, ' + k + ': the endpoints say "' + want[k].ep + '": ' + b[0][0]);
      eq([b[0][2], b[1][0], b[1][2]], [want[k].good ? 'good' : 'bad', want[k].good ? 'it works' : 'it fails', want[k].good ? 'good' : 'bad'], 'service lab, ' + k + ': the verdict');
      eq((await callouts())[0][0], want[k].good ? 'good' : 'bad', 'service lab, ' + k + ': the callout kind');
      await noRaw('service lab, ' + k);
    }
  });

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 4: five Jobs. How many pods a failing Job makes is worked out here from backoffLimit.
  await section('jobs lab', async () => {
    await open('jobs');
    eq(await chipVals('jb-k'), ['never', 'onfailure', 'parallel', 'deadline', 'ttl'], 'jobs lab: five Jobs');
    const files = { never: 'job-fail-never.yaml', onfailure: 'job-fail-onfailure.yaml', parallel: 'job-parallel.yaml', deadline: 'job-deadline.yaml', ttl: 'job-ttl.yaml' };
    const bo = +/backoffLimit:\s*(\d+)/.exec(F(files.never))[1], NV = C('job.never'), OF = C('job.onfailure'), PA = C('job.parallel'), DL = C('job.deadline'), TT = C('job.ttl');
    for (const k of Object.keys(files)) {
      await pick('jb-k', k);
      eq(await chipOn('jb-k'), [k], 'jobs lab: ' + k + ' is selected');
      eq((await codes())[0], F(files[k]).trim(), 'jobs lab, ' + k + ': the manifest');
      const b = await bigs(), all = (await callouts()).map(c => c[1]).join(' ');
      if (k === 'never') { eq([b[0][0], b[1][0], b[2][0]], [String(bo + 1), 'Error', 'BackoffLimitExceeded'], 'jobs lab never: pods, their status, the reason'); ok(all.indexOf('first run and ' + bo + ' retries') >= 0, 'jobs lab never: the text counts first run and retries'); eq(NV.pods, bo + 1, 'jobs lab never: the recorded pods are backoffLimit + 1'); }
      if (k === 'onfailure') { eq([b[0][0], b[1][0], b[2][0], b[3][0]], ['1', String(OF.max_restarts_seen), 'BackoffLimitExceeded', '0'], 'jobs lab onfailure: one pod, its restarts, the reason, and no pod left'); }
      if (k === 'parallel') { eq([b[0][0], b[1][0], b[2][0]], ['4', '2', '4'], 'jobs lab parallel: completions, the most at once, successes'); ok(PA.peak_running <= 2, 'jobs lab parallel: the recording ran at most two at a time'); }
      if (k === 'deadline') eq([b[0][0], b[1][0]], ['Failed', 'DeadlineExceeded'], 'jobs lab deadline: condition and reason');
      if (k === 'ttl') { eq([b[0][0], b[1][0]], ['yes', TT.ttl_seconds + ' s'], 'jobs lab ttl: removed by the cluster, after the time to live'); }
      await noRaw('jobs lab, ' + k);
    }
  });

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 5: what survives a delete
  await section('storage lab', async () => {
    await open('store');
    eq(await chipVals('so-k'), ['pod', 'sts', 'pvc'], 'storage lab: three deletes');
    const RW = C('sto.rows'), AP = C('sto.after_pvc_delete');
    const policy = C('sto.pv').reclaim;
    const want = { pod: [fmt(RW.after_pod_deleted), 'good', 'a new pg-0 is running on the same claim'], sts: [fmt(RW.after_statefulset_recreated), 'good', 'the claim is still there'], pvc: [fmt(AP.rows_in_the_new_database), 'bad', 'volumes left: ' + AP.pv_count] };
    for (const k of Object.keys(want)) {
      await pick('so-k', k);
      eq(await chipOn('so-k'), [k], 'storage lab: ' + k + ' is selected');
      const b = await bigs();
      eq([b[0][0], b[0][2], b[1][0], b[2][0]], [want[k][0], want[k][1], fmt(RW.after_load), want[k][2]], 'storage lab, ' + k + ': orders afterwards, before, and what was kept');
      eq((await callouts())[0][0], want[k][1], 'storage lab, ' + k + ': the callout kind');
      if (k === 'pvc') ok(new RegExp('reclaim policy ' + policy).test((await callouts())[0][1]), 'storage lab pvc: names the reclaim policy ' + policy);
      await noRaw('storage lab, ' + k);
    }
  });

  // ---------------------------------------------------------------------------------------------------------------------------------
  // lab 6: deleting a pod. A pod without a handler waits for the grace period.
  await section('shutdown lab', async () => {
    await open('shutdown');
    const rows = T('probe.shutdown').rows;
    eq(await chipVals('sd-k'), rows.map((r, i) => String(i)), 'shutdown lab: one chip for each pod');
    for (let i = 0; i < rows.length; i++) {
      await pick('sd-k', String(i));
      const [name, waited, handled, grace] = rows[i], w = waited === 'yes', h = handled === 'yes';
      eq(await chipOn('sd-k'), [String(i)], 'shutdown lab: ' + name + ' is selected');
      eq((await codes())[0], F(i === 0 ? 'pod-worker.yaml' : 'pod-worker-nohandler.yaml').trim(), 'shutdown lab, ' + name + ': the manifest');
      const b = await bigs();
      eq([b[0][0], b[0][2], b[1][0], b[1][2]], [w ? 'waited ' + grace + ' s, then killed' : 'went at once', w ? 'bad' : 'good', h ? 'yes' : 'no', h ? 'good' : 'bad'], 'shutdown lab, ' + name + ': the delete and the handler');
      const l = (await lanes())[0];
      eq([l[1], l[2].trim()], [w ? 'SIGKILL at ' + grace + ' s' : 'gone at once', w ? 'bad' : 'good'], 'shutdown lab, ' + name + ': the grace period bar');
      eq((await callouts())[0][0], h ? 'good' : 'bad', 'shutdown lab, ' + name + ': the callout kind');
      ok(w === !h, 'shutdown lab, ' + name + ': waited is the opposite of handled in the recording');
      await noRaw('shutdown lab, ' + name);
    }
  });

  ok(errs.length === 0, 'the page logged no errors: ' + errs.join(' | '));
  await browser.close(); srv.close();
  console.log(fail ? fail + ' FAILED, ' + pass + ' lab checks passed' : pass + ' lab checks passed');
  process.exit(fail ? 1 : 0);
})();
