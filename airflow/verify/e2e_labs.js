// End-to-end test of the 13 labs of the Airflow tutorial, in a real browser.
// It opens airflow/index.html, clicks every chip and button of every lab, and compares what the page shows with
//   (a) what Apache Airflow 3.4.0 returned (airflow/js/real.js), and
//   (b) values that were worked out by hand and are written into this file (rules for cron fields, counts of runs, waves, rows of a table, durations).
// Nothing is read from the widget code. A lab that shows a wrong number, a stale label or a table that does not match the recording fails here,
// even when the logic behind it passes verify/check_widgets.js.
// Needs Playwright:  npm install playwright && npx playwright install chromium
// Run: node airflow/verify/e2e_labs.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const two = n => String(n).padStart(2, '0');
const num = s => parseFloat(String(s).replace(/,/g, ''));
const fmtN = n => n.toLocaleString('en-US');
const t16 = s => s.slice(0, 16).replace('T', ' ');
const stamp = ms => { const d = new Date(ms); return d.getUTCFullYear() + '-' + two(d.getUTCMonth() + 1) + '-' + two(d.getUTCDate()) + ' ' + two(d.getUTCHours()) + ':' + two(d.getUTCMinutes()); };
const day = ms => stamp(ms).slice(0, 10);
const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const secs = s => { const m = /^([\d.,]+) (ms|s|min)\b/.exec(String(s).trim()); if (!m) return NaN; const v = num(m[1]); return m[2] === 'ms' ? v / 1000 : m[2] === 'min' ? v * 60 : v; };

(async () => {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end(); }
    res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + srv.address().port + '/airflow/index.html';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(url); await page.waitForTimeout(300);

  const R = await page.evaluate(() => LAB.real.counts);
  const sceneOf = kind => page.evaluate(k => { let found = null; LAB.chapters.forEach(c => c.scenes.forEach(s => { if (s.type === 'widget' && s.kind === k) found = { id: s.id, steps: LAB.R.widget.steps(s) }; })); return found; }, kind);
  const go = async key => { await page.evaluate(k => { location.hash = k; }, key); await page.waitForTimeout(30); };
  const pick = async (act, v) => { await page.click('[data-act="' + act + '"][data-v="' + v + '"]'); await page.waitForTimeout(15); };
  const press = async act => { await page.click('[data-act="' + act + '"]'); await page.waitForTimeout(15); };
  const reset = key => page.evaluate(k => { LAB.app.local[k] = undefined; LAB.app.render(true); }, key).then(() => page.waitForTimeout(20));
  const tables = () => page.$$eval('.lab .tbl', ts => ts.map(t => [...t.querySelectorAll('tbody tr')].map(r => [...r.children].map(td => td.innerText.trim().replace(/\s*\n\s*/g, ' ')))));
  const heads = () => page.$$eval('.lab .tbl', ts => ts.map(t => [...t.querySelectorAll('thead th')].map(x => x.innerText.trim())));
  const bigs = () => page.$$eval('.lab .big', els => els.map(e => ({ b: e.querySelector('b').textContent, s: e.querySelector('span').textContent })));
  const chipd = () => page.$$eval('.lab .chip-d', els => els.map(e => e.textContent));
  const chipVals = act => page.$$eval('[data-act="' + act + '"]', els => els.map(e => e.getAttribute('data-v')));
  const chipOn = act => page.$$eval('[data-act="' + act + '"].on', els => els.map(e => e.getAttribute('data-v')));
  const labText = () => page.$eval('.lab', e => e.innerText.replace(/\s+/g, ' ').trim());
  const looseText = () => page.$eval('.lab', el => { const c = el.cloneNode(true); c.querySelectorAll('.code').forEach(x => x.remove()); return c.innerText; });
  // no markup shows as text: backticks and double asterisks outside the code blocks mean that a string skipped the formatter
  const noRaw = async where => { const t = await looseText(); ok(!/[`]|\*\*|undefined|NaN/.test(t), where + ' shows no raw markup, undefined or NaN: ' + (t.match(/.{0,30}([`]|\*\*|undefined|NaN).{0,30}/) || [''])[0]); };
  const section = async (name, fn) => { try { await fn(); } catch (e) { fail++; console.log('FAIL:', name, 'threw', String(e.message).split('\n')[0]); } };

  // ------------------------------------------------------------------------------------------------------------------------------
  // cron lab: the next fires of sixteen expressions, found here by looking at every minute after the recorded start with a rule written by hand
  // ------------------------------------------------------------------------------------------------------------------------------
  await section('cron lab', async () => {
    const sc = await sceneOf('cron'), RC = R['af.cron'], start = Date.parse(RC.start);
    // a rule for one minute: mi minute, h hour, d day of the month, w day of the week (0 is Sunday). Both a day of the month and a day of the week are set in
    // the two traps, and cron then runs on a day that matches either one.
    const RULE = {
      '*/15 * * * *': t => t.mi % 15 === 0,
      '0 * * * *': t => t.mi === 0,
      '30 3 * * *': t => t.mi === 30 && t.h === 3,
      '0 2 * * *': t => t.mi === 0 && t.h === 2,
      '0 */6 * * *': t => t.mi === 0 && t.h % 6 === 0,
      '15 2,14 * * *': t => t.mi === 15 && (t.h === 2 || t.h === 14),
      '0 9-17 * * 1-5': t => t.mi === 0 && t.h >= 9 && t.h <= 17 && t.w >= 1 && t.w <= 5,
      '0 6 * * MON': t => t.mi === 0 && t.h === 6 && t.w === 1,
      '0 0 1 * *': t => t.mi === 0 && t.h === 0 && t.d === 1,
      '0 0 15 * *': t => t.mi === 0 && t.h === 0 && t.d === 15,
      '45 23 * * 0': t => t.mi === 45 && t.h === 23 && t.w === 0,
      '0 22 * * 1-5': t => t.mi === 0 && t.h === 22 && t.w >= 1 && t.w <= 5,
      '0 0 13 * 5': t => t.mi === 0 && t.h === 0 && (t.d === 13 || t.w === 5),
      '0 12 1-7 * 1': t => t.mi === 0 && t.h === 12 && ((t.d >= 1 && t.d <= 7) || t.w === 1),
      '@daily': t => t.mi === 0 && t.h === 0,
      '@weekly': t => t.mi === 0 && t.h === 0 && t.w === 0,
      '0 0 31 * *': t => t.mi === 0 && t.h === 0 && t.d === 31
    };
    const scan = (rule, n) => {
      const out = []; let t = Math.floor(start / 60000) * 60000 + 60000;
      while (out.length < n && t < start + 800 * 86400000) { const d = new Date(t); if (rule({ mi: d.getUTCMinutes(), h: d.getUTCHours(), d: d.getUTCDate(), w: d.getUTCDay() })) out.push(t); t += 60000; }
      return out;
    };
    const rows = (list) => list.map((t, i) => [String(i + 1), stamp(t), DOW[new Date(t).getUTCDay()]]);
    const LIST = ['*/15 * * * *', '0 * * * *', '30 3 * * *', '0 2 * * *', '0 */6 * * *', '15 2,14 * * *', '0 9-17 * * 1-5', '0 6 * * MON', '0 0 1 * *', '0 0 15 * *', '45 23 * * 0', '0 22 * * 1-5', '0 0 13 * 5', '0 12 1-7 * 1', '@daily', '@weekly'];
    await go(sc.id + ':0'); await reset('cr');
    ok(same(await chipVals('cr-e'), LIST), 'cron lab offers the sixteen expressions');
    for (const e of LIST) {
      await pick('cr-e', e);
      const mine = scan(RULE[e], 5), shown = (await tables())[0];
      ok(same(shown, rows(mine)), 'cron lab, "' + e + '": the table shows the next five fires found by hand (got ' + JSON.stringify(shown.map(r => r[1])) + ', hand ' + JSON.stringify(mine.map(stamp)) + ')');
      ok(same(mine.map(stamp), RC.exprs[e].fires.slice(0, 5).map(t16)), 'cron lab, "' + e + '": the rule worked out by hand gives the fires that Airflow recorded');
      ok(same(await chipOn('cr-e'), [e]), 'cron lab: the chip "' + e + '" is the selected one');
    }
    await go(sc.id + ':1');
    const TRAPS = ['0 0 13 * 5', '0 12 1-7 * 1', '0 0 31 * *'];
    ok(same(await chipVals('cr-t'), TRAPS), 'cron lab offers the three traps');
    for (const e of TRAPS) {
      await pick('cr-t', e);
      const mine = scan(RULE[e], 6), shown = (await tables())[0];
      ok(same(shown, rows(mine)), 'cron lab trap "' + e + '": six fires found by hand (got ' + JSON.stringify(shown.map(r => r[1])) + ')');
    }
    // the months with a 31st day, by hand: March, May, July, August, October, December
    await pick('cr-t', '0 0 31 * *');
    ok(same((await tables())[0].map(r => r[1].slice(0, 7)), ['2026-03', '2026-05', '2026-07', '2026-08', '2026-10', '2026-12']), 'cron lab: the 31st exists in March, May, July, August, October and December');
  });

  // ------------------------------------------------------------------------------------------------------------------------------
  // interval lab: the first runs of six timetables, the manual runs, and the values a task can read
  // ------------------------------------------------------------------------------------------------------------------------------
  await section('interval lab', async () => {
    const sc = await sceneOf('interval'), TT = R['af.timetables'], CTX = R['af.ctx'];
    const KEY = { 'trigger|0 2 * * *': 'cron_trigger_utc', 'interval|0 2 * * *': 'cron_interval_utc', 'trigger|@daily': 'daily_trigger', 'interval|@daily': 'daily_interval', 'trigger|0 6 * * 1': 'weekly_trigger', 'interval|0 6 * * 1': 'weekly_interval' };
    await go(sc.id + ':0'); await reset('iv');
    ok(same(await chipVals('iv-k'), ['trigger', 'interval']) && same(await chipVals('iv-e'), ['0 2 * * *', '@daily', '0 6 * * 1']), 'interval lab offers two kinds and three expressions');
    const PERIOD = { '0 2 * * *': 86400000, '@daily': 86400000, '0 6 * * 1': 7 * 86400000 };
    for (const [k, key] of Object.entries(KEY)) {
      const [kind, expr] = k.split('|');
      await pick('iv-k', kind); await pick('iv-e', expr);
      const rows = (await tables())[0], rec = TT[key].runs.slice(0, 3);
      ok(same(rows.map(r => r.slice(1, 5)), rec.map(r => [r.logical_date, r.interval_start, r.interval_end, r.run_after].map(t16))), 'interval lab, ' + k + ': the first three runs are the ones that Airflow created (' + key + ')');
      ok(same(rows.map(r => r[5]), rows.map(r => r[1].slice(0, 10))), 'interval lab, ' + k + ': ds is the date of the logical date');
      // by hand: the runs are one period apart. A data-interval run reads the period before it started, a trigger run reads no interval and starts at once.
      const ms = rows.map(r => Date.parse(r[1].replace(' ', 'T') + ':00Z')), s = rows.map(r => Date.parse(r[2].replace(' ', 'T') + ':00Z')), e = rows.map(r => Date.parse(r[3].replace(' ', 'T') + ':00Z')), a = rows.map(r => Date.parse(r[4].replace(' ', 'T') + ':00Z'));
      ok(ms[1] - ms[0] === PERIOD[expr] && ms[2] - ms[1] === PERIOD[expr], 'interval lab, ' + k + ': runs are one period apart');
      if (kind === 'interval') ok(e.every((x, i) => x - s[i] === PERIOD[expr] && a[i] === x && ms[i] === s[i]), 'interval lab, ' + k + ': the interval is one period long, the run starts when it ends, and the logical date is its start');
      else ok(e.every((x, i) => x === s[i] && a[i] === x && ms[i] === x), 'interval lab, ' + k + ': a trigger run has no interval: start, end, logical date and run time are the same moment');
    }
    // step 1: the same first run in three timetables
    await go(sc.id + ':1');
    const t1 = (await tables())[0], I0 = TT.cron_interval_utc.runs[0], T1 = TT.cron_trigger_utc.runs[1], X1 = TT.cron_trigger_interval.runs[1];
    ok(t1[0][2] === t16(I0.interval_start) + ' to ' + t16(I0.interval_end) && t1[0][3] === t16(I0.logical_date).slice(0, 10), 'interval lab, step 2: the data-interval timetable reads ' + t16(I0.interval_start) + ' to ' + t16(I0.interval_end));
    ok(t1[1][2].includes(t16(T1.logical_date)) && t1[1][3] === t16(T1.logical_date).slice(0, 10), 'interval lab, step 2: the trigger timetable reads no interval and ds is the day of the run');
    ok(t1[2][2] === t16(X1.interval_start) + ' to ' + t16(X1.interval_end) && t1[2][3] === t16(X1.interval_start).slice(0, 10), 'interval lab, step 2: the trigger timetable with an interval reads the day before');
    // step 2: a manual run at 01:30, 15:30 and 23:30
    await go(sc.id + ':2');
    ok(same(await chipVals('iv-h'), ['1', '15', '23']), 'interval lab offers three manual run times');
    for (const h of [1, 15, 23]) {
      await pick('iv-h', h);
      const rows = (await tables())[0], at = '2026-03-14 ' + two(h) + ':30';
      const m = key => TT[key].manual.find(x => t16(x.run_after) === at);
      ok(same(rows.map(r => r.slice(1)), [['cron_trigger_utc'], ['cron_interval_utc'], ['cron_trigger_interval']].map(([key]) => [t16(m(key).interval_start), t16(m(key).interval_end)])), 'interval lab, manual run at ' + h + ':30: the three intervals are the ones that Airflow inferred');
      // by hand: the data-interval timetable reads the last full period that ended before the run: the day that ends at the last 02:00 before the run
      const run = Date.parse('2026-03-14T' + two(h) + ':30:00Z'), last2 = Date.parse('2026-03-14T02:00:00Z') <= run ? Date.parse('2026-03-14T02:00:00Z') : Date.parse('2026-03-13T02:00:00Z');
      ok(rows[1][1] === stamp(last2 - 86400000) && rows[1][2] === stamp(last2), 'interval lab, manual run at ' + h + ':30: the data-interval timetable reads the day that ended at ' + stamp(last2));
      ok(rows[0][1] === at && rows[0][2] === at, 'interval lab, manual run at ' + h + ':30: the cron trigger timetable reads a point, the moment of the run');
    }
    const t2 = await tables();
    const flat = JSON.stringify(t2[1]);
    ok(t2[1][0][0] === 'logical_date' && /<missing>/.test(t2[1][0][2]) && t2[1][3][2] === 'None' && t2[1][2][2] === '<missing>', 'interval lab: a manual run with no date has no logical date, no interval and ds None as an argument');
    ok(CTX.scheduled.has_logical_date === true && CTX.manual.has_logical_date === false && /2026-03-14/.test(flat), 'interval lab: the recording agrees (a manual run has no logical date)');
  });

  // ------------------------------------------------------------------------------------------------------------------------------
  // catchup lab: runs, runs at the same time and waves for 32 settings, then the three backfill behaviors
  // ------------------------------------------------------------------------------------------------------------------------------
  await section('catchup lab', async () => {
    const sc = await sceneOf('catchup'), CV = R['af.catchup'].variants, BF = R['af.backfill'];
    await go(sc.id + ':0'); await reset('cu');
    ok(same(await chipVals('cu-d'), ['1', '2', '4', '9']) && same(await chipVals('cu-m'), ['1', '2', '4', '16']), 'catchup lab offers 1, 2, 4 and 9 days behind and four values of max_active_runs');
    for (const d of [1, 2, 4, 9]) for (const c of ['on', 'off']) for (const m of [1, 2, 4, 16]) {
      await pick('cu-d', d); await pick('cu-c', c); await pick('cu-m', m);
      // by hand: with catchup on, the days from the start date to today are all due, and today's run too: d + 1 runs. Off: only the latest run.
      const runs = c === 'on' ? d + 1 : 1, peak = Math.min(runs, m), waves = Math.ceil(runs / m);
      const b = await bigs(), chips = await chipd();
      ok(same(b.map(x => x.b), [String(runs), String(peak), String(waves)]), 'catchup lab, ' + d + ' days behind, catchup ' + c + ', max_active_runs ' + m + ': ' + runs + ' runs, ' + peak + ' at a time, ' + waves + ' waves (got ' + b.map(x => x.b).join(', ') + ')');
      if (m === 16) await noRaw('catchup lab, ' + d + ' days, catchup ' + c);
      ok(chips.length === runs && chips[chips.length - 1] === '2026-03-14' && chips[0] === day(Date.UTC(2026, 2, 14) - (runs - 1) * 86400000), 'catchup lab, ' + d + ' days, catchup ' + c + ': the logical dates run from ' + day(Date.UTC(2026, 2, 14) - (runs - 1) * 86400000) + ' to 2026-03-14 (got ' + chips[0] + ' to ' + chips[chips.length - 1] + ')');
    }
    await pick('cu-d', 4); await pick('cu-c', 'on'); await pick('cu-m', 2);
    const note = await labText();
    ok(note.includes('catchup off made ' + CV.brewline_catchup_off.run_count + ' run') && note.includes('made ' + CV.brewline_catchup_on.run_count + ' runs with ' + CV.brewline_catchup_on.peak_parallel_runs + ' '), 'catchup lab: four days behind quotes the recorded runs (1 run off, 5 runs on, 2 at a time)');
    ok(/catchup=True, max_active_runs=2/.test(note), 'catchup lab: the code shows catchup=True and max_active_runs=2');
    await go(sc.id + ':1'); await reset('cu');
    ok(same(await chipVals('cu-b'), ['none', 'failed', 'completed']), 'catchup lab offers the three reprocess behaviors');
    // the command help: none only creates runs that are missing, failed also clears the failed ones, completed clears every finished run
    const WANT = { none: ['leaves it alone', 'leaves it alone', 'creates the run'], failed: ['leaves it alone', 'clears the run and runs it again', 'creates the run'], completed: ['clears the run and runs it again', 'clears the run and runs it again', 'creates the run'] };
    for (const beh of ['none', 'failed', 'completed']) {
      await pick('cu-b', beh);
      const rows = (await tables())[0];
      await noRaw('catchup lab, ' + beh);
      ok(same(rows, [['2026-03-05', 'success', WANT[beh][0]], ['2026-03-06', 'failed', WANT[beh][1]], ['2026-03-07', 'no run', WANT[beh][2]]]), 'catchup lab, --reprocess-behavior ' + beh + ': ' + JSON.stringify(rows));
    }
    const txt = await labText();
    ok(txt.includes('from ' + BF.tries_after_none.join(', ') + ' to ' + BF.tries_after_completed.join(', ')) && txt.includes('three backfill runs'), 'catchup lab: the callout quotes the recorded try numbers, ' + BF.tries_after_none.join(', ') + ' then ' + BF.tries_after_completed.join(', '));
    ok(txt.includes('made 0 new runs') || /made 0 new runs/.test(txt.replace(/<\/?b>/g, '')), 'catchup lab: the callout says that the second call made no new run');
  });

  // ------------------------------------------------------------------------------------------------------------------------------
  // time zone lab: nine tables of five runs each, against the recorded local times, with the hours between runs worked out here
  // ------------------------------------------------------------------------------------------------------------------------------
  await section('time zone lab', async () => {
    const sc = await sceneOf('dst'), D = R['af.dst'];
    await go(sc.id + ':0'); await reset('dz');
    const CASES = ['America/New_York|spring', 'America/New_York|autumn', 'Europe/London|london'];
    ok(same(await chipVals('dz-c'), CASES) && same(await chipVals('dz-e'), ['0', '1', '2']), 'time zone lab offers three cases and three expressions');
    for (const c of CASES) for (const e of [0, 1, 2]) {
      await pick('dz-c', c); await pick('dz-e', e);
      const [tz, season] = c.split('|'), rec = D.rows.filter(r => r.tz === tz && r.season === season)[e], rows = (await tables())[0];
      const utc = rec.runs.map(x => Date.parse(x.utc.slice(0, 16).replace(' ', 'T') + ':00Z'));
      const want = rec.runs.map((x, i) => [x.local, x.utc.slice(0, 16), i ? String((utc[i] - utc[i - 1]) / 3600000) : '']);
      ok(same(rows, want), 'time zone lab, ' + c + ', ' + rec.expr + ': five runs with their local time, UTC and hours since the run before (got ' + JSON.stringify(rows.map(r => r[2])) + ', want ' + JSON.stringify(want.map(r => r[2])) + ')');
    }
    // by hand: in New York the clocks go forward on 8 March 2026 and back on 1 November 2026, and in London on 29 March
    await pick('dz-c', 'America/New_York|spring'); await pick('dz-e', 1);
    ok(same((await tables())[0].map(r => r[2]), ['', '24', '24', '23', '24']), 'time zone lab: a run at 01:30 in New York has 23 hours before it on 9 March, the day after the clocks went forward');
    await pick('dz-c', 'America/New_York|autumn'); await pick('dz-e', 0);
    ok((await tables())[0].map(r => r[2]).includes('25'), 'time zone lab: a run in New York has 25 hours before it on the day after the clocks went back');
  });

  // ------------------------------------------------------------------------------------------------------------------------------
  // idempotency lab: four runs (14, 14, 15 and 14 March) into a table by three strategies
  // ------------------------------------------------------------------------------------------------------------------------------
  await section('idempotency lab', async () => {
    const sc = await sceneOf('idem'), ID = R['af.idempotent'];
    await go(sc.id + ':0'); await reset('id');
    ok(same(await chipVals('id-s'), ['append', 'replace', 'upsert']), 'idempotency lab offers append, replace and upsert');
    // by hand: each run loads the three orders of its day. Append adds them again, replace deletes the day first, upsert overwrites by key.
    const WANT = {
      append: { rows: [3, 6, 9, 12], extra: [0, 3, 3, 6], perday: [[3], [6], [6, 3], [9, 3]] },
      replace: { rows: [3, 3, 6, 6], extra: [0, 0, 0, 0], perday: [[3], [3], [3, 3], [3, 3]] },
      upsert: { rows: [3, 3, 6, 6], extra: [0, 0, 0, 0], perday: [[3], [3], [3, 3], [3, 3]] }
    };
    for (const s of ['append', 'replace', 'upsert']) {
      await pick('id-s', s);
      for (let run = 0; run < 4; run++) {
        if (run > 0) await press('id-run');
        const b = await bigs(), t = (await tables())[0], chips = await chipd();
        ok(b[0].b === String(WANT[s].rows[run]) && b[1].b === String(WANT[s].extra[run]), 'idempotency lab, ' + s + ' after run ' + (run + 1) + ': ' + WANT[s].rows[run] + ' rows and ' + WANT[s].extra[run] + ' extra copies (got ' + b[0].b + ' and ' + b[1].b + ')');
        ok(same(t.map(r => num(r[1])), WANT[s].perday[run]) && t.every(r => r[2] === '3'), 'idempotency lab, ' + s + ' after run ' + (run + 1) + ': rows for each day ' + JSON.stringify(WANT[s].perday[run]) + ' (got ' + JSON.stringify(t.map(r => r[1])) + ')');
        ok(chips.length === run + 1, 'idempotency lab, ' + s + ': ' + (run + 1) + ' runs are listed');
        const rec = ID['brewline_load_' + s][run];
        ok(rec.rows === WANT[s].rows[run], 'idempotency lab, ' + s + ': Airflow recorded ' + WANT[s].rows[run] + ' rows after run ' + (run + 1));
      }
      ok(await page.$eval('[data-act="id-run"]', e => e.disabled), 'idempotency lab, ' + s + ': the button is off after the fourth run');
      await press('id-reset');
      ok((await bigs())[0].b === '3' && (await chipd()).length === 1, 'idempotency lab, ' + s + ': reset goes back to the first run and three rows');
    }
  });

  // ------------------------------------------------------------------------------------------------------------------------------
  // mapping lab: the number of mapped task instances and the size of an XCom
  // ------------------------------------------------------------------------------------------------------------------------------
  await section('mapping lab', async () => {
    const sc = await sceneOf('fanout'), ME = R['af.mapping_edge'], XS = R['af.xcom_size'];
    await go(sc.id + ':0'); await reset('fo');
    ok(same(await chipVals('fo-n'), ['0', '1', '5', '100', '1100']), 'mapping lab offers five list lengths');
    const MAX = +ME.max_map_length;
    ok(MAX === 1024, 'recorded: max_map_length is 1024');
    for (const n of [0, 1, 5, 100, 1100]) {
      await pick('fo-n', n);
      // by hand: no items means nothing to map and the mapped task is skipped; more than max_map_length fails the task that returns the list
      const inst = n > MAX ? 0 : n, listState = n > MAX ? 'failed' : 'success', mapped = n === 0 ? 'skipped' : n > MAX ? 'upstream_failed' : 'success';
      const b = await bigs(), txt = await labText();
      ok(b[0].b === String(inst) && b[1].b === listState, 'mapping lab, ' + n + ' items: ' + inst + ' instances, the list task is ' + listState + ' (got ' + b[0].b + ', ' + b[1].b + ')');
      ok(txt.includes(mapped), 'mapping lab, ' + n + ' items: the text says that the mapped task is ' + mapped);
    }
    ok(ME.empty.load_store === 'skipped' && ME.big.load_store === 'upstream_failed' && ME.big_list_length > MAX, 'recorded: an empty list skips the mapped task and a list over the limit leaves it upstream_failed');
    await go(sc.id + ':1');
    ok(same(await chipVals('fo-s'), ['1 KB', '100 KB', '1 MB', '10 MB']), 'mapping lab offers four sizes');
    const SIZE = { '1 KB': 1000, '100 KB': 100000, '1 MB': 1000000, '10 MB': 10000000 };
    const TASK = { '1 KB': 'return_1_kb', '100 KB': 'return_100_kb', '1 MB': 'return_1_mb', '10 MB': 'return_10_mb' };
    for (const s of Object.keys(SIZE)) {
      await pick('fo-s', s);
      const b = await bigs(), rec = XS.rows.find(r => r.task === TASK[s]);
      // by hand: a string of N characters is stored as JSON, with two quote characters around it
      ok(b[0].b === fmtN(SIZE[s] + 2) && b[1].b === 'success', 'mapping lab, ' + s + ': ' + fmtN(SIZE[s] + 2) + ' bytes stored (got ' + b[0].b + ', ' + b[1].b + ')');
      ok(rec.stored_bytes === SIZE[s] + 2 && rec.state === 'success', 'recorded: ' + TASK[s] + ' stored ' + (SIZE[s] + 2) + ' bytes');
    }
  });

  // ------------------------------------------------------------------------------------------------------------------------------
  // assets lab: events in a fixed order, and when each consumer runs
  // ------------------------------------------------------------------------------------------------------------------------------
  await section('assets lab', async () => {
    const sc = await sceneOf('assets'), AS = R['af.assets'];
    await go(sc.id + ':0'); await press('as-r');
    ok(same((await bigs()).map(x => x.b), ['0', '0', '0']), 'assets lab: starts with no run and no event waiting');
    // by hand: the first consumer runs once for each orders event. The second one needs an event from both assets: it takes every event that is waiting, and
    // a customers event on its own waits for the next orders event.
    const SEQ = [['as-o', [1, 0, 1]], ['as-o', [2, 0, 2]], ['as-o', [3, 0, 3]], ['as-c', [3, 1, 0]], ['as-c', [3, 1, 1]], ['as-o', [4, 2, 0]]];
    let n = 0;
    for (const [act, want] of SEQ) {
      await press(act); n++;
      const b = (await bigs()).map(x => +x.b);
      ok(same(b, want), 'assets lab, after ' + n + ' events (' + SEQ.slice(0, n).map(x => x[0] === 'as-o' ? 'orders' : 'customers').join(', ') + '): ' + want.join(', ') + ' (got ' + b.join(', ') + ')');
      if (n === 3) ok(AS.consumer_runs_after_3_events === 3 && AS.and_consumer_runs_before === 0, 'recorded: three orders events made three runs of the first consumer and none of the second');
      if (n === 4) {
        const t = JSON.stringify((await tables())[0]);
        ok(/3 orders_raw/.test(t) && /1 customers_raw/.test(t) && AS.and_consumer_runs_after === 1, 'assets lab: the first run of the second consumer took 3 orders events and 1 customers event');
      }
      if (n === 5) ok(AS.and_runs_after_extra_customers_event === 1, 'recorded: a customers event on its own starts nothing');
      if (n === 6) ok(AS.and_runs_after_extra_orders_event === 2, 'recorded: the next orders event starts the second run');
    }
    await press('as-r');
    ok(same((await bigs()).map(x => x.b), ['0', '0', '0']), 'assets lab: reset clears the runs and the waiting events');
  });

  // ------------------------------------------------------------------------------------------------------------------------------
  // retry lab: 162 settings. Airflow's own function gave the waits of 27 of them for five failed tries, and the rest is arithmetic on those.
  // ------------------------------------------------------------------------------------------------------------------------------
  await section('retry lab', async () => {
    const sc = await sceneOf('retry'), RG = R['af.retry_grid'], BO = R['af.backoff'];
    await go(sc.id + ':0'); await reset('rt');
    ok(same(await chipVals('rt-r'), ['0', '1', '2', '3', '4', '5']) && same(await chipVals('rt-d'), ['1', '5', '30']) && same(await chipVals('rt-m'), ['0', '2', '3']) && same(await chipVals('rt-c'), ['0', '10', '60']), 'retry lab offers retries 0 to 5, delays 1, 5 and 30, multipliers off, 2 and 3, caps none, 10 and 60');
    for (const d of [1, 5, 30]) for (const m of [0, 2, 3]) for (const c of [0, 10, 60]) {
      const rec = RG.rows.find(x => x.delay === d && x.mult === m && (x.cap || 0) === c);
      await pick('rt-d', d); await pick('rt-m', m); await pick('rt-c', c);
      for (const r of [0, 1, 2, 3, 4, 5]) {
        await pick('rt-r', r);
        const waits = rec.waits.slice(0, r), b = await bigs(), t = (await tables())[0] || [];
        const where = 'retry lab, retries ' + r + ', delay ' + d + ', multiplier ' + (m || 'off') + ', cap ' + (c || 'none');
        await noRaw(where);
        if (r === 0) { ok(b.length === 0 && t.length === 0 && (await labText()).includes('the first failure is the last'), where + ': with no retries the lab says that the first failure is the last and shows no wait'); continue; }
        ok(b[0].b === String(r + 1), where + ': ' + (r + 1) + ' tries at most (got ' + b[0].b + ')');
        ok(Math.abs(secs(b[1].b) - waits.reduce((x, y) => x + y, 0)) < 0.5, where + ': waiting in total ' + waits.reduce((x, y) => x + y, 0) + ' s (got ' + b[1].b + ')');
        if (r > 0) ok(b[2].b === waits.join(', '), where + ': the waits are ' + waits.join(', ') + ' (got ' + b[2].b + ')');
        ok(t.length === r, where + ': ' + r + ' rows in the table');
        let clock = 0;
        t.forEach((row, i) => {
          clock += waits[i];
          const base = m ? Math.max(Math.ceil(d * Math.pow(m, i)), 1) : d;
          ok(num(row[0]) === i + 1 && num(row[1]) === base && num(row[3]) === waits[i] && num(row[4]) === clock, where + ', failed try ' + (i + 1) + ': backoff ' + base + ' s, wait ' + waits[i] + ' s, ' + clock + ' s since the first failure (got ' + row.join(' | ') + ')');
          const jitter = num(row[2].replace('+', ''));
          if (!m) ok(jitter === 0 && waits[i] === d, where + ', failed try ' + (i + 1) + ': no multiplier means no backoff and no jitter');
          else if (!c) ok(jitter >= 0 && jitter < base && waits[i] === base + jitter, where + ', failed try ' + (i + 1) + ': jitter is between 0 and the backoff, less one second');
          else ok(waits[i] <= c && waits[i] >= Math.min(base, c), where + ', failed try ' + (i + 1) + ': the wait is capped at ' + c + ' s and is not below the backoff');
        });
      }
    }
    // a retry delay of 5 s with no multiplier: five tries wait 5 s each (by hand)
    await pick('rt-d', 5); await pick('rt-m', 0); await pick('rt-c', 0); await pick('rt-r', 4);
    ok(same((await bigs()).map(x => x.b), ['5', '20 s', '5, 5, 5, 5']), 'retry lab: four retries at 5 s, with no backoff, wait 20 s in total');
    await go(sc.id + ':1');
    const t = (await tables())[0];
    ok(same(t.map(r => [num(r[2]), num(r[3])]), BO.delays_in_database.map((x, i) => [x, x])), 'retry lab, step 2: the due times in the database, ' + BO.delays_in_database.join(', ') + ', are the ones that this lab gives');
    ok(same(t.map(r => num(r[1])), [1, 2, 4, 8]), 'retry lab, step 2: the backoff before jitter doubles: 1, 2, 4, 8 seconds');
  });

  // ------------------------------------------------------------------------------------------------------------------------------
  // trigger rules lab: thirteen rules and ten mixes of three parents, 130 children that Airflow ran
  // ------------------------------------------------------------------------------------------------------------------------------
  await section('trigger rules lab', async () => {
    const sc = await sceneOf('trig'), TR = R['af.trigger_rules'];
    await go(sc.id + ':0'); await reset('tr');
    ok(same(await chipVals('tr-r'), TR.rules) && TR.rules.length === 13, 'trigger rules lab offers the thirteen rules');
    const setParents = async want => {
      for (let k = 0; k < 3; k++) for (let i = 0; i < 4; i++) {
        const cur = (await page.$eval('[data-act="tr-p"][data-v="' + k + '"]', e => e.textContent)).split(': ')[1].trim();
        if (cur === want[k]) break;
        await pick('tr-p', k);
      }
    };
    let cells = 0;
    for (const mix of TR.mixes) {
      const s = +mix[0], f = +mix[1], k = +mix[2];
      const parents = [].concat(Array(s).fill('success'), Array(f).fill('failed'), Array(k).fill('skipped'));
      await setParents(parents);
      const labels = await page.$$eval('[data-act="tr-p"]', els => els.map(e => e.textContent.split(': ')[1].trim()));
      ok(same(labels, parents), 'trigger rules lab: the three parents are ' + parents.join(', ') + ' (got ' + labels.join(', ') + ')');
      for (const rule of TR.rules) {
        await pick('tr-r', rule);
        const b = await bigs(), txt = await labText();
        if (mix === TR.mixes[0]) await noRaw('trigger rules lab, ' + rule);
        ok(b[0].b === TR.results[rule][mix], 'trigger rules lab, ' + rule + ' with ' + s + ' succeeded, ' + f + ' failed, ' + k + ' skipped: the child is ' + TR.results[rule][mix] + ' (got ' + b[0].b + ')');
        ok(txt.includes('Mix of parents: ' + s + ' succeeded, ' + f + ' failed, ' + k + ' skipped.'), 'trigger rules lab: the note names the mix ' + mix);
        cells++;
      }
    }
    ok(cells === 130, 'trigger rules lab: 130 cells compared, got ' + cells);
    // by hand: the three rules of the lesson (cleanup, alert, join after a branch)
    const H = TR.results;
    ok(['300', '210', '120', '030'].every(m => H.all_done[m] === 'success'), 'by hand: all_done runs whatever happened');
    ok(H.one_failed['300'] === 'skipped' && H.one_failed['210'] === 'success' && H.one_failed['012'] === 'success', 'by hand: one_failed runs when a parent failed and is skipped when none did');
    ok(H.none_failed_min_one_success['300'] === 'success' && H.none_failed_min_one_success['102'] === 'success' && H.none_failed_min_one_success['003'] === 'skipped', 'by hand: none_failed_min_one_success runs after a branch and is skipped when every parent is');
    await go(sc.id + ':1');
    const t = (await tables())[0], h = (await heads())[0];
    ok(same(h, ['Rule'].concat(TR.mixes.map(m => m[0] + 's ' + m[1] + 'f ' + m[2] + 'k'))), 'trigger rules lab, step 2: the columns are the ten mixes');
    ok(same(t, TR.rules.map(r => [r].concat(TR.mixes.map(m => TR.results[r][m])))), 'trigger rules lab, step 2: all 130 cells of the table are the recorded states');
  });

  // ------------------------------------------------------------------------------------------------------------------------------
  // sensor lab: poke, reschedule and deferrable against the recorded samples
  // ------------------------------------------------------------------------------------------------------------------------------
  await section('sensor lab', async () => {
    const sc = await sceneOf('waiting'), W = R['af.waiting'];
    await go(sc.id + ':0'); await reset('wt');
    ok(same(await chipVals('wt-m'), ['poke', 'reschedule', 'deferrable']), 'sensor lab offers three modes');
    for (const m of ['poke', 'reschedule', 'deferrable']) {
      await pick('wt-m', m);
      const bars = await page.$$eval('.lab .gbar', els => els.length);
      ok(bars >= 4, 'sensor lab, ' + m + ': the picture has bars for the four sensors (found ' + bars + ')');
      ok(same(await chipOn('wt-m'), [m]), 'sensor lab: ' + m + ' is the selected mode');
    }
    await go(sc.id + ':1');
    const rows = (await tables())[0];
    ok(same(rows.map(r => r[0]), ['poke', 'reschedule', 'deferrable']), 'sensor lab, step 2: one row for each mode');
    rows.forEach(r => {
      const f = W[r[0]].facts;
      ok(Math.abs(num(r[1]) - f.slot_seconds) < 0.06 && num(r[2]) === f.max_holding_a_slot && num(r[3]) === f.max_running && num(r[4]) === f.max_deferred && Math.abs(secs(r[5]) - f.seconds_until_all_done) < 0.06, 'sensor lab, step 2: ' + r[0] + ' row equals the recorded facts ' + JSON.stringify(f) + ' (got ' + r.join(' | ') + ')');
    });
    // by hand: the slot seconds fall from poke to reschedule to deferrable, and only deferrable has deferred tasks
    ok(num(rows[0][1]) > num(rows[1][1]) && num(rows[1][1]) > num(rows[2][1]) && num(rows[0][4]) === 0 && num(rows[1][4]) === 0 && num(rows[2][4]) === 4, 'sensor lab, step 2: slot seconds fall from poke to reschedule to deferrable, and four sensors were deferred at once in the last one');
  });

  // ------------------------------------------------------------------------------------------------------------------------------
  // capacity lab: six tasks of three seconds, pool slots and the DAG limit. Peak, waves and seconds are worked out here: peak is the smallest of tasks, pool,
  // limit and parallelism (32); waves are tasks divided by peak, rounded up; seconds are waves times three.
  // ------------------------------------------------------------------------------------------------------------------------------
  await section('capacity lab', async () => {
    const sc = await sceneOf('capacity'), PL = R['af.pools'];
    await go(sc.id + ':0'); await reset('cp');
    ok(same(await chipVals('cp-p'), ['1', '2', '3', '6', '128']) && same(await chipVals('cp-l'), ['2', '4', '16']), 'capacity lab offers five pool sizes and three DAG limits');
    for (const p of [1, 2, 3, 6, 128]) for (const l of [2, 4, 16]) {
      await pick('cp-p', p); await pick('cp-l', l);
      const peak = Math.min(6, p, l, 32), waves = Math.ceil(6 / peak), b = await bigs();
      ok(same(b.map(x => x.b), [String(peak), String(waves), waves * 3 + ' s']), 'capacity lab, pool ' + p + ', DAG limit ' + l + ': ' + peak + ' at once, ' + waves + ' waves, ' + waves * 3 + ' s (got ' + b.map(x => x.b).join(', ') + ')');
    }
    ok(PL.brewline_pool_two_slots.peak_running === 2 && PL.brewline_dag_limit.peak_running === 2, 'recorded: a pool of two slots and a DAG limit of two both gave two tasks at once');
    await go(sc.id + ':1');
    const pr = PL.brewline_pool_priority, t = (await tables())[0], t0 = Math.min.apply(null, pr.tasks.map(x => x.start));
    ok(same(t.map(r => r[0]), pr.start_order) && same(t.map(r => num(r[1])), pr.start_order.map(n => +n.split('_')[1])), 'capacity lab, step 2: the tasks start in the order of their priority_weight, highest first: ' + pr.start_order.join(', '));
    ok(t.every((r, i) => Math.abs(num(r[2]) - (pr.tasks.find(x => x.task === r[0]).start - t0)) < 0.06), 'capacity lab, step 2: the start times are the recorded ones, in seconds from the first start');
  });

  // ------------------------------------------------------------------------------------------------------------------------------
  // why-idle lab: what each command printed
  // ------------------------------------------------------------------------------------------------------------------------------
  await section('why-idle lab', async () => {
    const sc = await sceneOf('whyidle'), FD = R['af.failed_deps'];
    await go(sc.id + ':0'); await reset('wi');
    const CAUSES = ['pool_full', 'dag_limit', 'upstream_running', 'depends_on_past'];
    ok(same(await chipVals('wi-c'), CAUSES), 'why-idle lab offers four causes');
    const PHRASE = { pool_full: 'Not scheduling since there are 0 open slots in pool', depends_on_past: 'depends_on_past is true', upstream_running: 'requires all upstream tasks to have succeeded', dag_limit: 'The maximum number of running tasks' };
    for (const c of CAUSES) {
      await pick('wi-c', c);
      const txt = await labText(), rec = FD[c].failed_deps.replace(/\s+/g, ' ');
      await noRaw('why-idle lab, ' + c);
      ok(txt.toLowerCase().includes(PHRASE[c].toLowerCase()), 'why-idle lab, ' + c + ': the page shows "' + PHRASE[c] + '"');
      ok(rec.toLowerCase().includes(PHRASE[c].toLowerCase()), 'recorded: the output of failed-deps for ' + c + ' contains "' + PHRASE[c] + '"');
      ok(txt.includes(FD[c].task_id) || txt.includes(FD[c].dag_id), 'why-idle lab, ' + c + ': the page names the task or the DAG that was asked');
    }
  });

  // ------------------------------------------------------------------------------------------------------------------------------
  // parse lab: files, seconds per file and processes. The lab says that a pass takes about files times seconds divided by parsing_processes. Real files differ in
  // size, so the average is the honest figure, and the lab does not round the files up to whole rounds.
  // ------------------------------------------------------------------------------------------------------------------------------
  await section('parse lab', async () => {
    const sc = await sceneOf('parse');
    await go(sc.id + ':0'); await reset('pc');
    ok(same(await chipVals('pc-f'), ['10', '100', '1000']) && same(await chipVals('pc-s'), ['0.002', '0.5', '2']) && same(await chipVals('pc-p'), ['1', '2', '4']), 'parse lab offers 10, 100 and 1,000 files, 0.002, 0.5 and 2 seconds, 1, 2 and 4 processes');
    for (const f of [10, 100, 1000]) for (const s of [0.002, 0.5, 2]) for (const p of [1, 2, 4]) {
      await pick('pc-f', f); await pick('pc-s', s); await pick('pc-p', p);
      const want = f * s / p, got = secs((await bigs())[0].b);
      ok(Math.abs(got - want) <= Math.max(0.0006, want * 0.05), 'parse lab, ' + f + ' files of ' + s + ' s on ' + p + ' processes: ' + want + ' s (got ' + (await bigs())[0].b + ')');
    }
    // by hand: 1,000 files of 2 seconds on 1 process take 2,000 seconds: more than half an hour
    await pick('pc-f', 1000); await pick('pc-s', 2); await pick('pc-p', 1);
    ok((await bigs())[0].b === '33.3 min', 'parse lab: 1,000 files of 2 seconds on one process take 2,000 seconds, 33.3 minutes (got ' + (await bigs())[0].b + ')');
  });

  // ------------------------------------------------------------------------------------------------------------------------------
  // the labs keep working after all of that, and no step raised an error
  // ------------------------------------------------------------------------------------------------------------------------------
  const ws = await page.evaluate(() => { const o = []; LAB.chapters.forEach(c => c.scenes.forEach(s => { if (s.type === 'widget') o.push([s.id, LAB.R.widget.steps(s)]); })); return o; });
  ok(ws.length === 13, 'the course has 13 labs, found ' + ws.length);
  for (const [id, n] of ws) for (let i = 0; i < n; i++) {
    await go(id + ':' + i);
    ok(await page.$eval('.lab', e => e.innerText.length > 40), 'lab ' + id + ' step ' + (i + 1) + ' renders');
    await noRaw('lab ' + id + ' step ' + (i + 1));
  }
  ok(errs.length === 0, 'no console or page errors: ' + errs.slice(0, 3).join(' | '));

  console.log(pass + ' checks passed' + (fail ? ', ' + fail + ' failed' : ''));
  await browser.close(); srv.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
