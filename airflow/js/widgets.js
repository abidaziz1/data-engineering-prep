/* Airflow lab widgets, part 1: cron, data intervals, catchup and backfill, idempotent loads, mapping and XCom, trigger rules.
   Each one registers LAB.W.<kind> with steps, say, render. What a lab shows as a run, a state or a count comes from js/real.js, recorded from
   Apache Airflow 3.4.0 on one machine. The cron and data-interval labs apply the rules of the timetables in plain JavaScript, and the
   widget checker (verify/check_widgets.js) compares that logic with what Airflow returned for every recorded case. Nothing here ran on a managed service. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var W = (LAB.W = LAB.W || {});
  var esc = LAB.esc, md = LAB.md, H = LAB.H, G = LAB.get;

  function chips(list, cur, act, fmt) {
    return list.map(function (k) { return '<button type="button" class="sel-chip' + (String(k) === String(cur) ? ' on' : '') + '" data-act="' + act + '" data-v="' + esc(String(k)) + '">' + esc(fmt ? fmt(k) : String(k)) + '</button>'; }).join('');
  }
  function table(cols, rows, rowCls, cellCls) {
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r, ri) { return '<tr class="' + (rowCls ? rowCls(r, ri) || '' : '') + '">' + r.map(function (c, ci) { return '<td class="' + (cellCls ? cellCls(r, ri, ci) || '' : '') + '">' + md(String(c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  /* a date and a time on two lines, so that a narrow column breaks between them and never inside the date */
  function dt(s) { return String(s).replace(' ', '\n'); }
  function isDt(r, ri, ci) { return ci >= 1 && ci <= 4 ? 'dt' : ''; }
  function code(file, lang, text, hl) { return H.code({ file: file, lang: lang, code: text, hl: hl || null }); }
  function bindCodes(box) { box.querySelectorAll('.code').forEach(function (c) { H.bindCode(c, c.textContent); }); }
  function st(s) { return '<span class="st ' + s + '">' + esc(s) + '</span>'; }
  function big(items) { return '<div class="lab-out">' + items.map(function (x) { return '<div class="big' + (x[2] ? ' ' + x[2] : '') + '"><b>' + esc(String(x[0])) + '</b><span>' + esc(x[1]) + '</span></div>'; }).join('') + '</div>'; }

  /* ====================== a cron evaluator, in UTC ====================== */
  var PRESETS = { '@hourly': '0 * * * *', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@weekly': '0 0 * * 0', '@monthly': '0 0 1 * *', '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *' };
  var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'], DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  function fieldSet(txt, lo, hi, names) {
    var out = {};
    txt.split(',').forEach(function (part) {
      var step = 1, rng = part, m = /^(.*)\/(\d+)$/.exec(part);
      if (m) { rng = m[1]; step = +m[2]; }
      function num(x) { var i = names ? names.indexOf(x.toUpperCase()) : -1; return i >= 0 ? i + (names === MONTHS ? 1 : 0) : +x; }
      var a, b;
      if (rng === '*') { a = lo; b = hi; }
      else if (rng.indexOf('-') > 0) { var p = rng.split('-'); a = num(p[0]); b = num(p[1]); }
      else { a = num(rng); b = m ? hi : a; }
      for (var v = a; v <= b; v += step) out[v] = true;
    });
    return out;
  }
  function parseCron(expr) {
    expr = PRESETS[expr] || expr;
    var f = expr.trim().split(/\s+/);
    if (f.length !== 5) throw new Error('a cron expression has five fields');
    var dow = fieldSet(f[4], 0, 7, DAYS);
    if (dow[7]) dow[0] = true;                       /* 7 is Sunday as well */
    return { min: fieldSet(f[0], 0, 59), hour: fieldSet(f[1], 0, 23), dom: f[2] === 'L' ? {} : fieldSet(f[2], 1, 31), domLast: f[2] === 'L', mon: fieldSet(f[3], 1, 12, MONTHS), dow: dow,
      domAny: f[2] === '*', dowAny: f[4] === '*' };
  }
  function dayMatches(sp, y, m, d) {
    var dow = new Date(Date.UTC(y, m, d)).getUTCDay(), last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    var domOk = sp.domLast ? d === last : !!sp.dom[d], dowOk = !!sp.dow[dow];
    if (!sp.mon[m + 1]) return false;
    if (sp.domAny && sp.dowAny) return true;
    if (sp.domAny) return dowOk;
    if (sp.dowAny) return domOk;
    return domOk || dowOk;                        /* both fields restricted: a day matches when either one does */
  }
  /* the next n fire times at or after fromMs, as milliseconds */
  function fires(expr, fromMs, n) {
    var sp = parseCron(expr), out = [], from = new Date(fromMs), y = from.getUTCFullYear(), m = from.getUTCMonth(), d = from.getUTCDate();
    var mins = Object.keys(sp.min).map(Number).sort(function (a, b) { return a - b; }), hrs = Object.keys(sp.hour).map(Number).sort(function (a, b) { return a - b; });
    for (var guard = 0; guard < 9500 && out.length < n; guard++) {
      var day = new Date(Date.UTC(y, m, d + guard));
      if (!dayMatches(sp, day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate())) continue;
      for (var i = 0; i < hrs.length && out.length < n; i++) for (var j = 0; j < mins.length && out.length < n; j++) {
        var t = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hrs[i], mins[j]);
        if (t >= fromMs) out.push(t);
      }
    }
    return out;
  }
  function two(x) { return (x < 10 ? '0' : '') + x; }
  function fmt(ms) { var d = new Date(ms); return d.getUTCFullYear() + '-' + two(d.getUTCMonth() + 1) + '-' + two(d.getUTCDate()) + ' ' + two(d.getUTCHours()) + ':' + two(d.getUTCMinutes()); }
  function fmtDay(ms) { return fmt(ms).slice(0, 10); }
  function parseUtc(s) { var m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(s); return Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)); }

  W.cron = (function () {
    var LIST = ['*/15 * * * *', '0 * * * *', '30 3 * * *', '0 2 * * *', '0 */6 * * *', '15 2,14 * * *', '0 9-17 * * 1-5', '0 6 * * MON', '0 0 1 * *', '0 0 15 * *', '45 23 * * 0', '0 22 * * 1-5', '0 0 13 * 5', '0 12 1-7 * 1', '@daily', '@weekly'];
    function recorded(expr) { return G.counts('af.cron').exprs[expr]; }
    function nextFor(expr) { return fires(expr, parseUtc(G.counts('af.cron').start), 5); }
    var info = { fires: fires, parse: parseCron, list: LIST, fmt: fmt, parseUtc: parseUtc, next: nextFor };
    W.cronInfo = info;
    return {
      steps: function () { return 2; },
      hint: 'Pick an expression. Read the next five runs.',
      say: function (s, i) {
        return [
          'A schedule given as a cron expression is five fields: minute, hour, day of the month, month, day of the week. Pick one and read the next five times it fires, counted from ' + G.counts('af.cron').start.slice(0, 16).replace('T', ' ') + ' UTC. I asked Airflow for the same times with its own timetable, and they match.',
          'Two traps. When both the day of the month and the day of the week are set, a day matches if either one does, so `0 12 1-7 * 1` is not "the first Monday". And every time here is UTC, because the time zone of the DAG decides what 02:00 means.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var stt = A.local.cr || (A.local.cr = { expr: '0 2 * * *', typed: '' }), h = '<div class="lab">';
        if (i === 0) {
          var f = nextFor(stt.expr), rec = recorded(stt.expr);
          h += '<div class="lab-row"><span class="lab-l">Expression</span><div class="sel-chips">' + chips(LIST, stt.expr, 'cr-e') + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">In words</span><b>' + esc(rec.description) + '</b></div>' +
            code('DAG file', 'python', 'schedule="' + stt.expr + '"') +
            table(['#', 'Fires at (UTC)', 'Day'], f.map(function (t, k) { return [String(k + 1), fmt(t), DAYS[new Date(t).getUTCDay()]]; })) +
            '<p class="lab-note">Airflow\'s own answer for the same five times: ' + rec.fires.map(function (x) { return x.slice(0, 16); }).join(', ') + '.</p>';
        } else {
          var traps = ['0 0 13 * 5', '0 12 1-7 * 1', '0 0 31 * *'], cur = stt.trap || traps[0];
          var arec = G.counts('af.cron').exprs[cur] || { fires: [], description: '' };
          h += '<div class="lab-row"><span class="lab-l">Look at</span><div class="sel-chips">' + chips(traps, cur, 'cr-t') + '</div></div>' +
            table(['#', 'Fires at (UTC)', 'Day'], fires(cur, parseUtc(G.counts('af.cron').start), 6).map(function (t, k) { return [String(k + 1), fmt(t), DAYS[new Date(t).getUTCDay()]]; })) +
            '<div class="callout ' + (cur === '0 0 31 * *' ? 'tip' : 'warn') + '">' + md(cur === '0 0 13 * 5' ? 'Both the 13th and Friday are set, so it fires on **every Friday and on every 13th**, not only on Friday the 13th.' :
              cur === '0 12 1-7 * 1' ? 'Both the days 1 to 7 and Monday are set, so it fires on **days 1 to 7 and on every Monday**. To get the first Monday you need a check in the task.' :
                'A month that has no 31st is skipped: the expression fires only in months with 31 days.') + '</div>';
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'cr-e') stt.expr = v; if (act === 'cr-t') stt.trap = v; A.render(true); };
      }
    };
  })();

  /* ====================== logical date and data interval ====================== */
  W.interval = (function () {
    var KINDS = { trigger: 'CronTriggerTimetable (what a cron string gives you)', interval: 'CronDataIntervalTimetable', trigger_iv: 'CronTriggerTimetable with interval=1 day' };
    var EXPRS = ['0 2 * * *', '@daily', '0 6 * * 1'];
    var DAY = 86400000;
    /* the recording that holds each combination */
    var REC = { 'trigger|0 2 * * *': 'cron_trigger_utc', 'trigger|@daily': 'daily_trigger', 'trigger|0 6 * * 1': 'weekly_trigger',
      'interval|0 2 * * *': 'cron_interval_utc', 'interval|@daily': 'daily_interval', 'interval|0 6 * * 1': 'weekly_interval', 'trigger_iv|0 2 * * *': 'cron_trigger_interval' };
    function prevFire(expr, ms) {                          /* the last fire at or before ms */
      var best = null, f = fires(expr, ms - 40 * DAY, 3000);
      for (var k = 0; k < f.length; k++) { if (f[k] <= ms) best = f[k]; else break; }
      return best;
    }
    /* the runs of a timetable: fire times from the start date */
    function runs(kind, expr, startMs, n) {
      var f = fires(expr, startMs, n + 1), out = [];
      for (var k = 0; k < n; k++) {
        if (kind === 'interval') out.push({ logical: f[k], start: f[k], end: f[k + 1], runAfter: f[k + 1] });
        else if (kind === 'trigger') out.push({ logical: f[k], start: f[k], end: f[k], runAfter: f[k] });
        else out.push({ logical: f[k] - DAY, start: f[k] - DAY, end: f[k], runAfter: f[k] });
      }
      return out;
    }
    /* a manual run at runAfter: what the timetable infers */
    function manual(kind, expr, runAfterMs) {
      if (kind === 'trigger') return { start: runAfterMs, end: runAfterMs };
      if (kind === 'trigger_iv') return { start: runAfterMs - DAY, end: runAfterMs };
      var end = prevFire(expr, runAfterMs), prev = prevFire(expr, end - 60000);
      return { start: prev, end: end };
    }
    function kv(text, key) { var m = new RegExp('^' + key + ' = (.*)$', 'm').exec(text); if (!m) throw new Error('no "' + key + ' = " line in the recorded task log'); return m[1]; }
    var START = Date.UTC(2026, 2, 1), HOURS = [1, 15, 23];
    W.intervalInfo = { runs: runs, manual: manual, kinds: KINDS, exprs: EXPRS, rec: REC, start: START, hours: HOURS };
    return {
      steps: function () { return 3; },
      hint: 'Pick a timetable. Find the day of data that a run reads.',
      say: function (s, i) {
        return [
          'Two timetables for the same cron string. Pick one and read the first three runs from a start date of 1 March. A run has a **logical date**, a **data interval** (start and end) and a **run after** time: the moment it may start. For a data-interval timetable the run for a day starts when the day is over. For a trigger timetable it starts at the fire time and the interval is a single point.',
          'The question that decides your load: a run starts on 2 March at 02:00. Which day of orders does it read? Read the answer for each timetable. The third row is the recorded case of a trigger timetable that is given an interval.',
          'A manual run has no schedule to read, so the timetable infers an interval from the time of the click. Pick a click time and compare. And a manual run started without a logical date has none of these values at all: I recorded one next to a scheduled run.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var q = A.local.iv || (A.local.iv = { kind: 'trigger', expr: '0 2 * * *', hour: 15 }), h = '<div class="lab">';
        if (i === 0) {
          if (q.kind === 'trigger_iv') q.kind = 'trigger';
          var r = runs(q.kind, q.expr, START, 3);
          h += '<div class="lab-row"><span class="lab-l">Timetable</span><div class="sel-chips">' + chips(['trigger', 'interval'], q.kind, 'iv-k', function (k) { return KINDS[k]; }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">Cron</span><div class="sel-chips">' + chips(EXPRS, q.expr, 'iv-e') + '</div></div>' +
            table(['Run', 'logical_date', 'data_interval_start', 'data_interval_end', 'run_after (starts)', 'ds'], r.map(function (x, k) { return [String(k + 1), dt(fmt(x.logical)), dt(fmt(x.start)), dt(fmt(x.end)), dt(fmt(x.runAfter)), fmtDay(x.logical)]; }), null, isDt) +
            '<p class="lab-note">Start date 2026-03-01, UTC, catchup on so that you can see the first runs. Airflow 3.4.0 returned the same rows for these cases.</p>';
        } else if (i === 1) {
          var tt = G.counts('af.timetables'), ci = tt.cron_trigger_interval.runs[1];
          h += table(['Timetable', 'The run that starts 2026-03-02 02:00', 'Interval it reads', '`ds`'], [
            ['Cron data interval, `0 2 * * *`', 'the first run', '2026-03-01 02:00 to 2026-03-02 02:00', '2026-03-01'],
            ['Cron trigger, `0 2 * * *`', 'the second run', 'none: a point, 2026-03-02 02:00', '2026-03-02'],
            ['Cron trigger with `interval=1 day`', 'the second run', '2026-03-01 02:00 to 2026-03-02 02:00', '2026-03-01']
          ]) +
            '<div class="callout tip">With the default trigger timetable, `ds` is the day the run **starts**. To read the day before, use a timetable with an interval, or `macros.ds_add(ds, -1)`. Recorded: the `cron_trigger_interval` timetable returned the interval ' + ci.interval_start.slice(0, 16) + ' to ' + ci.interval_end.slice(0, 16) + ' for the run that starts at ' + ci.run_after.slice(0, 16) + '.</div>';
        } else {
          var when = Date.UTC(2026, 2, 14, q.hour, 30), ctx = G.counts('af.ctx'), sch = ctx.scheduled.show_log, man = ctx.manual.show_log;
          var rowsM = ['trigger', 'interval', 'trigger_iv'].map(function (k) { var m = manual(k, '0 2 * * *', when); return [KINDS[k], dt(fmt(m.start)), dt(fmt(m.end))]; });
          h += '<div class="lab-row"><span class="lab-l">Click at</span><div class="sel-chips">' + chips(HOURS, q.hour, 'iv-h', function (k) { return '2026-03-14 ' + two(+k) + ':30'; }) + '</div></div>' +
            table(['Timetable (cron `0 2 * * *`)', 'data_interval_start', 'data_interval_end'], rowsM, null, function (r, ri, ci) { return ci >= 1 ? 'dt' : ''; }) +
            '<div class="lab-h">A manual run without a logical date (recorded)</div>' +
            table(['Value in the task', 'Scheduled run', 'Manual run, no date'], [['logical_date', kv(sch, 'logical_date'), kv(man, 'logical_date')], ['data_interval_start', kv(sch, 'data_interval_start'), kv(man, 'data_interval_start')], ['ds', kv(sch, 'ds'), kv(man, 'ds')], ['`ds` as a function argument', kv(ctx.scheduled.templated_log, 'ds argument'), kv(ctx.manual.templated_log, 'ds argument')]]);
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'iv-k') q.kind = v; if (act === 'iv-e') q.expr = v; if (act === 'iv-h') q.hour = +v; A.render(true); };
      }
    };
  })();

  /* ====================== catchup and backfill ====================== */
  W.catchup = (function () {
    function plan(days, catchup, mar) {
      var n = catchup ? days + 1 : 1;
      return { runs: n, peak: Math.min(mar, n), waves: Math.ceil(n / Math.min(mar, n)) };
    }
    function backfill(existing, behavior) {                /* existing: states of the days in the window, 'none' for a missing run */
      return existing.map(function (s) {
        if (s === 'none') return 'create';
        if (behavior === 'completed') return 'rerun';
        if (behavior === 'failed' && s === 'failed') return 'rerun';
        return 'keep';
      });
    }
    W.catchupInfo = { plan: plan, backfill: backfill };
    var DAYSB = [1, 2, 4, 9];
    return {
      steps: function () { return 2; },
      hint: 'Change the days, catchup and max_active_runs.',
      say: function (s, i) {
        return [
          'A daily DAG is switched on N days after its start date. With catchup off, Airflow makes one run for the latest slot. With catchup on, it makes a run for every missed slot, and `max_active_runs` decides how many of them run at the same time. The recording below used a start date four days back.',
          'A backfill is a request for a date range, and `--reprocess-behavior` decides what it does with runs that exist. The window has three days: one run succeeded, one failed, one does not exist. Pick a behavior and read what happens.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var q = A.local.cu || (A.local.cu = { days: 4, catchup: 'on', mar: 2, beh: 'none' }), h = '<div class="lab">';
        if (i === 0) {
          var p = plan(q.days, q.catchup === 'on', q.mar), today = Date.UTC(2026, 2, 14), list = [];
          for (var k = p.runs - 1; k >= 0; k--) list.push(fmtDay(today - k * 86400000));
          var rec = G.counts('af.catchup').variants, recNote = q.days === 4 ? ('Recorded with a start date four days back: catchup off made ' + rec.brewline_catchup_off.run_count + ' run, catchup on with max_active_runs 2 made ' + rec.brewline_catchup_on.run_count + ' runs with ' + rec.brewline_catchup_on.peak_parallel_runs + ' at once, and with max_active_runs 1 the peak was ' + rec.brewline_catchup_serial.peak_parallel_runs + '.') : 'The recording used four days; change the days to 4 to see it.';
          h += '<div class="lab-row"><span class="lab-l">Days behind</span><div class="sel-chips">' + chips(DAYSB, q.days, 'cu-d') + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">catchup</span><div class="sel-chips">' + chips(['on', 'off'], q.catchup, 'cu-c') + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">max_active_runs</span><div class="sel-chips">' + chips([1, 2, 4, 16], q.mar, 'cu-m') + '</div></div>' +
            big([[p.runs, 'runs made when the DAG is switched on'], [p.peak, 'runs at the same time at most', p.peak > 4 ? 'warn' : ''], [p.waves, 'waves of runs']]) +
            '<div class="lab-h">Logical dates of the runs</div><div class="chips">' + list.map(function (d) { return '<span class="chip-d on">' + d + '</span>'; }).join('') + '</div>' +
            code('DAG file', 'python', 'with DAG(dag_id="brewline_daily", schedule="@daily",\n         start_date=pendulum.datetime(2026, 3, 10, tz="UTC"),\n         catchup=' + (q.catchup === 'on' ? 'True' : 'False') + ', max_active_runs=' + q.mar + ') as dag:') +
            '<p class="lab-note">' + esc(recNote) + '</p>';
        } else {
          var ex = ['success', 'failed', 'none'], acts = backfill(ex, q.beh), bf = G.counts('af.backfill');
          h += '<div class="lab-row"><span class="lab-l">--reprocess-behavior</span><div class="sel-chips">' + chips(['none', 'failed', 'completed'], q.beh, 'cu-b') + '</div></div>' +
            table(['Day', 'Run that exists', 'What the backfill does'], ex.map(function (e, k) { return ['2026-03-0' + (5 + k), e === 'none' ? 'no run' : e, acts[k] === 'create' ? 'creates the run' : acts[k] === 'rerun' ? 'clears the run and runs it again' : 'leaves it alone']; }), function (r, k) { return acts[k] === 'keep' ? '' : 'new'; }) +
            '<div class="callout tip">Recorded: three backfill runs were created for the window ' + esc(bf.window[0].slice(0, 10)) + ' to ' + esc(bf.window[1].slice(0, 10)) + '. A second call with `none` made <b>' + (bf.runs_after_second_call - bf.runs_after_first_call) + '</b> new runs. A call with `completed` raised the try number of the task of each run from ' + bf.tries_after_none.join(', ') + ' to ' + bf.tries_after_completed.join(', ') + '. The `failed` behavior is from the command help, not from a run.</div>';
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'cu-d') q.days = +v; if (act === 'cu-c') q.catchup = v; if (act === 'cu-m') q.mar = +v; if (act === 'cu-b') q.beh = v; A.render(true); };
      }
    };
  })();

  /* ====================== an idempotent load ====================== */
  W.idem = (function () {
    var IDS = { append: 'brewline_load_append', replace: 'brewline_load_replace', upsert: 'brewline_load_upsert' };
    var LABEL = { append: 'INSERT only (append)', replace: 'DELETE the day, then INSERT', upsert: 'INSERT ... ON CONFLICT DO UPDATE' };
    function rowsFor(strategy) { return G.counts('af.idempotent')[IDS[strategy]]; }
    W.idemInfo = { rows: rowsFor, ids: IDS };
    return {
      steps: function () { return 1; },
      hint: 'Pick a load. Press Run once, then again.',
      say: function () { return 'The same load task, written three ways, ran for 14 March, again for 14 March, then for 15 March, then once more for 14 March. Each press of Run replays one real run of the DAG and shows the table afterwards. Watch what a repeat does.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var q = A.local.id || (A.local.id = { strategy: 'append', at: 1 }), rows = rowsFor(q.strategy), cur = rows[q.at - 1], h = '<div class="lab">';
        var src = G.file('dags/' + IDS[q.strategy] + '.py');
        h += '<div class="lab-row"><span class="lab-l">The load</span><div class="sel-chips">' + chips(Object.keys(LABEL), q.strategy, 'id-s', function (k) { return LABEL[k]; }) + '</div></div>' +
          code(IDS[q.strategy] + '.py (the task)', 'python', G.lines(src, G.at(src, /@task/), G.at(src, /print\(/))) +
          '<div class="lab-row"><span class="lab-l">Runs so far</span><div class="sel-chips">' + rows.slice(0, q.at).map(function (r, k) { return '<span class="chip-d on">' + (k + 1) + ': ' + esc(r.step) + '</span>'; }).join('') + '</div>' +
          '<button type="button" class="btn-sm" data-act="id-run"' + (q.at >= rows.length ? ' disabled' : '') + '>Run the next one</button><button type="button" class="btn-sm" data-act="id-reset">Start again</button></div>';
        var dup = Object.keys(cur.per_day).reduce(function (a, d) { return a + Math.max(0, cur.per_day[d] - 3); }, 0);
        h += big([[cur.rows, 'rows in the table'], [dup, 'extra copies of an order', dup ? 'bad' : 'good']]) +
          table(['Day', 'Rows', 'Orders that day'], Object.keys(cur.per_day).map(function (d) { return [d, String(cur.per_day[d]), '3']; }), function (r) { return +r[1] > 3 ? 'dup' : ''; }) +
          '<p class="lab-note">Recorded with SQLite and `airflow dags test`. A run that you repeat after a failure, a clear or a backfill must leave the table the same as one run did.</p>';
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) {
          if (act === 'id-s') { q.strategy = el.getAttribute('data-v'); q.at = 1; }
          if (act === 'id-run') q.at = Math.min(rowsFor(q.strategy).length, q.at + 1);
          if (act === 'id-reset') q.at = 1;
          A.render(true);
        };
      }
    };
  })();

  /* ====================== dynamic task mapping and XCom ====================== */
  W.fanout = (function () {
    var LENGTHS = [0, 1, 5, 100, 1100];
    function outcome(n) {
      var max = +G.counts('af.mapping_edge').max_map_length;
      if (n === 0) return { kind: 'empty', tasks: 0, mapped: 'skipped' };
      if (n > max) return { kind: 'toolong', tasks: 0, mapped: 'upstream_failed' };
      return { kind: 'ok', tasks: n, mapped: 'success' };
    }
    W.fanoutInfo = { outcome: outcome, lengths: LENGTHS };
    return {
      steps: function () { return 2; },
      hint: 'Pick the length of the list. Read what the DAG run does.',
      say: function (s, i) {
        return [
          'A mapped task makes one task instance for each item of a list, and the list is only known when the run is going. Pick a length. Five items are the recorded Brewline stores. An empty list and a list longer than `max_map_length` (the default is ' + G.counts('af.mapping_edge').max_map_length + ') are the two edge cases that I ran.',
          'Everything a task returns is written to the metadata database as an XCom. I made four tasks return a string of 1 KB, 100 KB, 1 MB and 10 MB, and read back the size that was stored.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var q = A.local.fo || (A.local.fo = { n: 5, size: '1 MB' }), h = '<div class="lab">';
        if (i === 0) {
          var o = outcome(q.n), e = G.counts('af.mapping_edge'), cells = '';
          for (var k = 0; k < Math.min(o.tasks, 24); k++) cells += '<div class="tcell success"><b>load_store<wbr>[' + k + ']</b><span>success</span></div>';
          if (o.tasks > 24) cells += '<div class="tcell success"><b>...</b><span>' + (o.tasks - 24) + ' more</span></div>';
          if (o.kind === 'empty') cells = '<div class="tcell skipped"><b>load_store</b><span>skipped</span></div>';
          if (o.kind === 'toolong') cells = '<div class="tcell upstream_failed"><b>load_store</b><span>upstream_failed</span></div>';
          h += '<div class="lab-row"><span class="lab-l">Items in the list</span><div class="sel-chips">' + chips(LENGTHS, q.n, 'fo-n') + '</div></div>' +
            big([[o.tasks, 'mapped task instances'], [o.kind === 'toolong' ? 'failed' : 'success', 'the task that returns the list', o.kind === 'toolong' ? 'bad' : 'good']]) +
            '<div class="tgrid">' + cells + '</div>' +
            '<div class="callout ' + (o.kind === 'ok' ? 'tip' : 'warn') + '">' + md(o.kind === 'empty' ? 'An **empty list** makes no instances. The mapped task is `' + e.empty.load_store + '`, and a task after it that uses `all_done` still ran (`summarize` was `' + e.empty.summarize + '`).' :
              o.kind === 'toolong' ? 'The task that returns the list **fails**, because its value is too long to map: `' + e.big_error + '`. The mapped task is `' + e.big.load_store + '`.' : 'Each instance has a `map_index` from 0. They run in parallel up to the limits of the DAG, the pool and the executor.') + '</div>';
        } else {
          var xs = G.counts('af.xcom_size').rows, want = 'return_' + q.size.toLowerCase().replace(' ', '_'), sel = xs.filter(function (r) { return r.task === want; })[0];
          if (!sel) throw new Error('no recorded XCom size for ' + want);
          h += '<div class="lab-row"><span class="lab-l">Returned value</span><div class="sel-chips">' + chips(['1 KB', '100 KB', '1 MB', '10 MB'], q.size, 'fo-s') + '</div></div>' +
            big([[sel.stored_bytes.toLocaleString('en-US'), 'bytes stored in the xcom_v2 table'], [sel.state, 'state of the task', 'good']]) +
            '<p class="lab-note">Recorded on a SQLite metadata database. It accepted every size here. That is not a promise about your database, and a value that big is still a bad idea: every reader of the XCom loads it through the API server. Return a path or a table name, and keep the data in storage.</p>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'fo-n') q.n = +v; if (act === 'fo-s') q.size = v; A.render(true); };
      }
    };
  })();

  /* ====================== trigger rules ====================== */
  W.trig = (function () {
    /* three parents: s succeeded, f failed, k skipped. The state of the child that Airflow 3.4.0 gave for each rule and each mix. */
    function decide(rule, s, f, k) {
      var n = s + f + k;
      switch (rule) {
        case 'all_success': return f > 0 ? 'upstream_failed' : k > 0 ? 'skipped' : 'success';
        case 'all_failed': return f === n ? 'success' : 'skipped';
        case 'all_done': return 'success';
        case 'all_done_min_one_success': return k > 0 ? 'skipped' : s > 0 ? 'success' : 'upstream_failed';
        case 'all_done_setup_success': return 'success';
        case 'one_success': return s > 0 ? 'success' : f > 0 ? 'upstream_failed' : 'skipped';
        case 'one_failed': return f > 0 ? 'success' : 'skipped';
        case 'one_done': return s + f > 0 ? 'success' : 'skipped';
        case 'none_failed': return f > 0 ? 'upstream_failed' : 'success';
        case 'none_skipped': return k > 0 ? 'skipped' : 'success';
        case 'always': return 'success';
        case 'none_failed_min_one_success': return f > 0 ? 'upstream_failed' : s > 0 ? 'success' : 'skipped';
        case 'all_skipped': return k === n ? 'success' : 'skipped';
      }
      throw new Error('unknown rule ' + rule);
    }
    function mixOf(parents) { var c = { success: 0, failed: 0, skipped: 0 }; parents.forEach(function (p) { c[p]++; }); return c.success + '' + c.failed + c.skipped; }
    var WORDS = {
      all_success: 'every parent succeeded (the default)', all_failed: 'every parent failed', all_done: 'every parent has finished, whatever happened', all_done_min_one_success: 'every parent finished and at least one succeeded',
      all_done_setup_success: 'every parent finished and the setup tasks succeeded', one_success: 'at least one parent succeeded', one_failed: 'at least one parent failed', one_done: 'at least one parent succeeded or failed',
      none_failed: 'no parent failed (skipped is fine)', none_skipped: 'no parent was skipped', always: 'nothing: it runs whatever happened', none_failed_min_one_success: 'no parent failed and at least one succeeded', all_skipped: 'every parent was skipped'
    };
    W.trigInfo = { decide: decide, mixOf: mixOf, words: WORDS };
    return {
      steps: function () { return 2; },
      hint: 'Click a parent to change its state. Pick a rule.',
      say: function (s, i) {
        return [
          'A task starts when its trigger rule says so. The child here has three parents. Click a parent to make it succeed, fail or be skipped, and pick a rule. The state of the child comes from my recording: for each of the 13 rules I ran a DAG with ten children, one for each mix of three parents, and read the state of every child.',
          'The whole recorded table. Find the rule for a cleanup task, an alert, and the join after a branch.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var q = A.local.tr || (A.local.tr = { rule: 'all_success', parents: ['success', 'failed', 'skipped'] }), T = G.counts('af.trigger_rules'), h = '<div class="lab">';
        if (i === 0) {
          var mix = mixOf(q.parents), child = T.results[q.rule][mix];
          h += '<div class="lab-row"><span class="lab-l">Rule</span><div class="sel-chips">' + chips(T.rules, q.rule, 'tr-r') + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">Parents</span><div class="sel-chips">' + q.parents.map(function (p, k) { return '<button type="button" class="sel-chip on" data-act="tr-p" data-v="' + k + '">parent ' + (k + 1) + ': ' + p + '</button>'; }).join('') + '</div></div>' +
            code('DAG file', 'python', '[parent_1, parent_2, parent_3] >> child  # child has trigger_rule="' + q.rule + '"') +
            big([[child, 'state of the child', child === 'success' ? 'good' : 'warn']]) +
            '<p class="lab-note">`' + esc(q.rule) + '` means: ' + esc(WORDS[q.rule]) + '. Mix of parents: ' + mix[0] + ' succeeded, ' + mix[1] + ' failed, ' + mix[2] + ' skipped.</p>';
        } else {
          h += table(['Rule'].concat(T.mixes.map(function (m) { return m[0] + 's ' + m[1] + 'f ' + m[2] + 'k'; })), T.rules.map(function (r) { return [r].concat(T.mixes.map(function (m) { return T.results[r][m]; })); }), null, function (r, ri, ci) { return ci > 0 ? (r[ci] === 'success' ? 'wgood' : r[ci] === 'upstream_failed' ? 'wbad' : '') : ''; }) +
            '<div class="callout tip">Cleanup that must always run: `all_done` or `always`. An alert on failure: `one_failed`. The join after a branch: `none_failed_min_one_success`.</div>';
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'tr-r') q.rule = v;
          if (act === 'tr-p') { var k = +v, order = ['success', 'failed', 'skipped']; q.parents[k] = order[(order.indexOf(q.parents[k]) + 1) % 3]; }
          A.render(true);
        };
      }
    };
  })();
})();
