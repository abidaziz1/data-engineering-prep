/* Terminal simulator: prints scripted lines one by one and tells the diagram which node changed.
   Also builds realistic dbt build log lines from a short list of models/tests. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var T = (LAB.Term = {});

  /* line: { c: 'cmd'|'ok'|'warn'|'err'|'dim'|'out'|'hl', t: 'text', d: delay ms, node: id, st: 'run'|'ok'|'fail'|'skip'|'retry'|'wait' } */
  T.mount = function (host) {
    host.innerHTML = '<div class="term-body" role="log" aria-live="off" tabindex="0"></div>';
    var body = host.firstChild;
    var timer = null, idx = 0, lines = [], onStep = null, done = false, speed = 1;

    function addLine(l) {
      var d = document.createElement('div');
      d.className = 'tl tl-' + (l.c || 'out');
      d.textContent = l.t;
      body.appendChild(d);
      body.scrollTop = body.scrollHeight;
    }
    function step() {
      if (idx >= lines.length) { done = true; if (ctl.onDone) ctl.onDone(); return; }
      var l = lines[idx++];
      addLine(l);
      if (onStep) onStep(l, idx - 1);
      timer = setTimeout(step, (l.d != null ? l.d : 150) * speed);
    }
    var ctl = {
      play: function (ls, cb) {
        ctl.reset();
        lines = ls; onStep = cb; done = false; idx = 0;
        step();
      },
      skip: function () {
        clearTimeout(timer);
        while (idx < lines.length) {
          var l = lines[idx++];
          addLine(l);
          if (onStep) onStep(l, idx - 1);
        }
        done = true;
        if (ctl.onDone) ctl.onDone();
      },
      reset: function () { clearTimeout(timer); body.innerHTML = ''; idx = 0; done = false; },
      destroy: function () { clearTimeout(timer); },
      isDone: function () { return done; },
      onDone: null
    };
    return ctl;
  };

  function dots(label, tail, width) {
    var n = Math.max(3, width - label.length - 1);
    return label + ' ' + new Array(n + 1).join('.') + ' ' + tail;
  }
  function sec(ms) { return (ms / 1000).toFixed(2) + 's'; }

  /* Turn a recorded dbt log (plain text) into terminal lines, and tell the diagram which node changed.
     opts.cmd     the command line to print first, for example 'dbt build --target prod'
     opts.nodes   { shortName: graphNodeId }. A short name is the part of a relation after the schema, or the model of a test.
     opts.extra   { fullTestName: graphNodeId } for tests that do not name their model (singular tests)
     opts.hide    RegExp of lines to drop
     opts.keep    [from, to] keep only these line numbers of the log (0-based, end exclusive)
     opts.pace    1 is the normal speed, 0.5 is twice as fast */
  var HEAD = /^(\d\d:\d\d:\d\d)\s+(\d+) of (\d+) (START|OK|PASS|WARN|FAIL|ERROR|SKIP|NO-OP)\b(.*?)\s*\[(RUN|OK[^\]]*|PASS[^\]]*|WARN[^\]]*|FAIL[^\]]*|ERROR[^\]]*|SKIP|NO-OP[^\]]*|INSERT[^\]]*|SUCCESS[^\]]*)\]\s*$/;
  T.fromLog = function (text, opts) {
    opts = opts || {};
    var pace = opts.pace || 1;
    var nodes = opts.nodes || {}, extra = opts.extra || {};
    var names = Object.keys(nodes);
    function nodeOf(name, isTest) {
      if (extra[name]) return extra[name];
      var short = name.indexOf('::') >= 0 ? name.split('::')[0] : name.split('.').pop();
      if (!isTest) return nodes[short] || null;
      var best = null, at = 1e9;
      names.forEach(function (n) { var i = short.indexOf(n); if (i >= 0 && i < at) { at = i; best = n; } });
      return best ? nodes[best] : null;
    }
    var lines = text.split('\n');
    if (opts.keep) lines = lines.slice(opts.keep[0], opts.keep[1]);
    var out = [];
    if (opts.cmd) out.push({ c: 'cmd', t: '$ ' + opts.cmd, d: 350 * pace });
    lines.forEach(function (ln) {
      if (opts.hide && opts.hide.test(ln)) return;
      var m = HEAD.exec(ln);
      var l = { c: 'out', t: ln, d: 60 * pace };
      if (m) {
        var verb = m[4], head = m[5].replace(/[\s.]+$/, '').trim(), toks = head.split(/\s+/), name = toks[toks.length - 1];
        var isUnit = head.indexOf('::') >= 0;
        var isNode = !isUnit && /\b(model|seed|snapshot|exposure|relation|freshness)\b/.test(head);
        var id = nodeOf(name, !isNode);
        if (verb === 'START') { l.c = 'dim'; l.d = 110 * pace; if (id && isNode) { l.node = id; l.st = 'run'; } }
        else if (verb === 'OK' || verb === 'NO-OP') { l.c = 'ok'; l.d = 130 * pace; if (id && isNode) { l.node = id; l.st = 'ok'; } }
        else if (verb === 'PASS') { l.c = 'ok'; l.d = 130 * pace; }
        else if (verb === 'WARN') { l.c = 'warn'; l.d = 130 * pace; if (id && isNode) { l.node = id; l.st = 'retry'; } }
        else if (verb === 'SKIP') { l.c = 'warn'; l.d = 50 * pace; if (id && isNode) { l.node = id; l.st = 'skip'; } }
        else { l.c = 'err'; l.d = 300 * pace; if (id) { l.node = id; l.st = 'fail'; } }
      } else if (/\[ERROR\]|Completed with .*error/.test(ln)) { l.c = 'err'; l.d = 160 * pace; }
      else if (/\[WARNING\]/.test(ln)) { l.c = 'warn'; }
      else if (/Completed successfully/.test(ln)) { l.c = 'ok'; l.d = 160 * pace; }
      else if (/^\S*\s*Done\./.test(ln) || /\sDone\. PASS=/.test(ln)) { l.c = /ERROR=[1-9]/.test(ln) ? 'err' : 'hl'; l.d = 120 * pace; }
      else if (/^\d\d:\d\d:\d\d\s*$/.test(ln)) { l.t = ''; l.c = 'dim'; l.d = 30 * pace; }
      else if (/^\d\d:\d\d:\d\d\s+(Running with|Registered adapter|Found |Concurrency|Finished running)/.test(ln)) { l.c = 'dim'; l.d = 90 * pace; }
      out.push(l);
    });
    return out;
  };

  /* items: [{ kind: 'seed'|'view'|'table'|'incremental'|'snapshot'|'test', name, schema, ms, res: 'ok'|'fail'|'warn'|'skip', n, node }] */
  T.dbt = function (cmd, items, opts) {
    opts = opts || {};
    var W = opts.width || 74;
    var out = [];
    out.push({ c: 'cmd', t: '$ ' + cmd, d: 350 });
    out.push({ c: 'dim', t: 'Running with dbt=1.10.0', d: 120 });
    out.push({ c: 'dim', t: 'Registered adapter: snowflake=1.10.0', d: 120 });
    out.push({ c: 'dim', t: opts.found || 'Found 12 models, 2 seeds, 1 snapshot, 26 data tests, 4 sources', d: 120 });
    out.push({ c: 'dim', t: "Concurrency: 4 threads (target='" + (opts.target || 'prod') + "')", d: 300 });
    out.push({ c: 'dim', t: '', d: 100 });
    var total = items.length, i = 0, pass = 0, warn = 0, err = 0, skip = 0;
    items.forEach(function (it) {
      i++;
      var prefix = i + ' of ' + total + ' ';
      var name = (it.schema ? it.schema + '.' : '') + it.name;
      var startLabel, okLabel, kindWord;
      if (it.kind === 'test') {
        startLabel = prefix + 'START test ' + it.name;
      } else if (it.kind === 'seed') {
        startLabel = prefix + 'START seed file ' + name;
      } else if (it.kind === 'snapshot') {
        startLabel = prefix + 'START snapshot ' + name;
      } else {
        startLabel = prefix + 'START sql ' + it.kind + ' model ' + name;
      }
      if (it.res === 'skip') {
        out.push({ c: 'warn', t: dots(prefix + (it.kind === 'test' ? 'SKIP test ' + it.name : 'SKIP relation ' + name), '[SKIP]', W), d: 60, node: it.node, st: 'skip' });
        skip++;
        return;
      }
      out.push({ c: 'dim', t: dots(startLabel, '[RUN]', W), d: 160, node: it.node, st: 'run' });
      var secs = sec(it.ms || 900);
      if (it.kind === 'test') {
        if (it.res === 'ok') { out.push({ c: 'ok', t: dots(prefix + 'PASS ' + it.name, '[PASS in ' + secs + ']', W), d: 140, node: it.node, st: 'ok' }); pass++; }
        else if (it.res === 'warn') { out.push({ c: 'warn', t: dots(prefix + 'WARN ' + it.n + ' ' + it.name, '[WARN ' + it.n + ' in ' + secs + ']', W), d: 140, node: it.node, st: 'ok' }); warn++; }
        else { out.push({ c: 'err', t: dots(prefix + 'FAIL ' + it.n + ' ' + it.name, '[FAIL ' + it.n + ' in ' + secs + ']', W), d: 300, node: it.node, st: 'fail' }); err++; }
      } else if (it.kind === 'seed') {
        out.push({ c: 'ok', t: dots(prefix + 'OK loaded seed file ' + name, '[INSERT ' + (it.n || 3) + ' in ' + secs + ']', W), d: 140, node: it.node, st: 'ok' }); pass++;
      } else if (it.kind === 'snapshot') {
        out.push({ c: 'ok', t: dots(prefix + 'OK snapshotted ' + name, '[SUCCESS 1 in ' + secs + ']', W), d: 140, node: it.node, st: 'ok' }); pass++;
      } else {
        if (it.res === 'fail') { out.push({ c: 'err', t: dots(prefix + 'ERROR creating sql ' + it.kind + ' model ' + name, '[ERROR in ' + secs + ']', W), d: 300, node: it.node, st: 'fail' }); err++; }
        else { out.push({ c: 'ok', t: dots(prefix + 'OK created sql ' + it.kind + ' model ' + name, '[SUCCESS 1 in ' + secs + ']', W), d: 140, node: it.node, st: 'ok' }); pass++; }
      }
    });
    out.push({ c: 'dim', t: '', d: 150 });
    out.push({ c: 'dim', t: 'Finished running in 0 hours 0 minutes and ' + (opts.total || '34.80') + ' seconds.', d: 200 });
    out.push({ c: 'dim', t: '', d: 100 });
    out.push({ c: err ? 'err' : 'ok', t: err ? 'Completed with ' + err + ' error' + (err > 1 ? 's' : '') + ' and ' + warn + ' warnings:' : 'Completed successfully', d: 200 });
    if (err && opts.errorBlock) opts.errorBlock.forEach(function (t) { out.push({ c: 'err', t: t, d: 80 }); });
    out.push({ c: 'dim', t: '', d: 80 });
    out.push({ c: err ? 'err' : 'hl', t: 'Done. PASS=' + pass + ' WARN=' + warn + ' ERROR=' + err + ' SKIP=' + skip + ' NO-OP=0 TOTAL=' + total, d: 100 });
    return out;
  };
})();
