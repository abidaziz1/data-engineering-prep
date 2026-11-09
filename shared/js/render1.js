/* Scene renderers, part 1: explain-type scenes (SEE). Each renderer: steps(), say(), render(). */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var esc = LAB.esc, md = LAB.md, mdb = LAB.mdBlock;
  var R = (LAB.R = {});
  var H = (LAB.H = {});
  LAB.W = {};

  /* ---------- small HTML helpers ---------- */
  H.table = function (cols, rows, o) {
    o = o || {};
    var chg = {};
    (o.chg || []).forEach(function (p) { chg[p[0] + ',' + p[1]] = 1; });
    var h = '<div class="tbl-wrap"><table class="tbl' + (o.mono === false ? '' : ' mono') + '"><thead><tr>' +
      cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
    rows.forEach(function (r, ri) {
      h += '<tr class="' + (o.trk === ri ? 'trk' : '') + '">' + r.map(function (c, ci) {
        var cls = (chg[ri + ',' + ci] ? 'chg ' : '') + (String(c) === 'NULL' ? 'nul' : '');
        return '<td class="' + cls + '">' + md(c) + '</td>';
      }).join('') + '</tr>';
    });
    return h + '</tbody></table></div>';
  };

  var CFG = LAB.config || {};
  var LANG_LABEL = { sql: 'SQL', jinja: 'dbt model (SQL + Jinja)', python: 'Python', py: 'Python', yaml: 'YAML', yml: 'YAML', bash: 'Terminal', sh: 'Terminal', docker: 'Dockerfile', dockerfile: 'Dockerfile', groovy: 'Jenkinsfile', json: 'JSON', hcl: 'Terraform', tf: 'Terraform', text: 'Text' };
  Object.keys(CFG.langLabels || {}).forEach(function (k) { LANG_LABEL[k] = CFG.langLabels[k]; });

  H.code = function (o) {
    var lines = LAB.hl(o.code, o.lang);
    var on = o.hl;
    var h = '<div class="code' + (o.cls ? ' ' + o.cls : '') + '"><div class="code-head"><span class="file">' + esc(o.file || '') + '</span>' +
      '<span class="lang">' + esc(LANG_LABEL[o.lang] || o.lang) + '</span><button type="button" class="copy" data-act="copy">Copy</button></div>' +
      '<div class="code-body" tabindex="0">';
    lines.forEach(function (l, i) {
      var isOn = on && i + 1 >= on[0] && i + 1 <= on[1];
      h += '<div class="ln' + (isOn ? ' on' : '') + (o.clickable ? ' clk' : '') + '" data-n="' + (i + 1) + '"><span class="no">' + (i + 1) + '</span><span class="tx">' + (l || ' ') + '</span></div>';
    });
    return h + '</div></div>';
  };
  H.bindCode = function (box, code) {
    var b = box.querySelector('.copy');
    if (b) b.onclick = function () {
      var done = function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1400); };
      try { navigator.clipboard.writeText(code).then(done, done); } catch (e) { done(); }
    };
    var on = box.querySelector('.ln.on'), body = box.querySelector('.code-body');
    if (on && body && body.scrollHeight > body.clientHeight) {
      body.scrollTop = Math.max(0, on.offsetTop - 70);
    }
  };

  H.miniMap = function (focus) {
    var M = CFG.miniMap;
    if (!M) return '';
    var f = focus || [];
    function chip(p) { return '<span class="mm c-' + p[0] + (f.indexOf(p[0]) >= 0 ? ' on' : '') + '">' + esc(p[1]) + '</span>'; }
    return '<div class="minimap"><div class="mm-row">' + M.row1.map(chip).join(M.arrows === false ? '' : '<i class="mm-arrow">&rarr;</i>') + '</div>' +
      (M.row2 ? '<div class="mm-row mm-ctl">' + M.row2.map(chip).join('') + '</div>' : '') + '</div>';
  };

  /* ---------- intro (auto-built for every mission) ---------- */
  R.intro = {
    sec: 30,
    steps: function () { return 1; },
    say: function (s) { return s.say; },
    mood: function () { return 'happy'; },
    hint: 'Press Next to start the mission.',
    render: function (box, s, i, A) {
      var mins = A && A.missionMinutes ? A.missionMinutes(s.ch) : s.minutes;
      box.innerHTML = '<div class="intro"><div class="intro-top"><span class="intro-n">MISSION ' + s.n + '</span><span class="intro-t">about ' + mins + ' min on this track</span></div>' +
        (CFG.miniMap ? '<p class="intro-sub">' + esc(CFG.miniMap.caption || 'You are here:') + '</p>' + H.miniMap(s.focus) : '') +
        '<h3 class="goals-h">' + esc(CFG.goalsTitle || 'After this mission you can:') + '</h3><ul class="goals">' +
        s.goals.map(function (g) { return '<li>' + md(g) + '</li>'; }).join('') + '</ul></div>';
    }
  };

  /* ---------- talk: cards revealed one by one ---------- */
  R.talk = {
    sec: 22,
    steps: function (s) { return s.items ? s.items.length : 1; },
    say: function (s, i) { var it = s.items && s.items[i]; return (it && it.say) || (i === 0 ? s.say : null); },
    mood: function (s, i) { var it = s.items && s.items[i]; return (it && it.mood) || s.mood || 'happy'; },
    hint: 'Press Next for the next point.',
    render: function (box, s, i) {
      var h = '';
      if (s.lead) h += '<div class="lead">' + mdb(s.lead) + '</div>';
      if (s.items) {
        h += '<div class="cards' + (s.cols ? ' cols' + s.cols : '') + '">';
        s.items.slice(0, i + 1).forEach(function (it, k) {
          h += '<div class="card' + (k === i ? ' fresh' : '') + (it.c ? ' tone-' + it.c : '') + '">' +
            '<h3>' + (it.n ? '<span class="num">' + it.n + '</span>' : '') + md(it.h) + '</h3><div class="ct">' + mdb(it.t) + '</div></div>';
        });
        h += '</div>';
      }
      if (s.body) h += '<div class="bodytext">' + mdb(s.body) + '</div>';
      if (s.call) h += '<div class="callout ' + (s.call.k || 'tip') + '"><b>' + esc(s.call.h) + '</b> ' + md(s.call.t) + '</div>';
      box.innerHTML = h;
    }
  };

  /* ---------- flow: animated diagram, one hop per step ---------- */
  R.flow = {
    sec: 18, keep: true,
    steps: function (s) { return s.steps.length; },
    say: function (s, i) { return s.steps[i].say; },
    mood: function (s, i) { return s.steps[i].mood; },
    hint: 'Watch the orange blocks move. Press Next for the next hop.',
    render: function (box, s, i, A, o) {
      var st = s.steps[i];
      if (!o.same || !A.gctl || A.gctlScene !== s.id) {
        var legend = (s.legend === false) ? '' :
          '<div class="legend"><span><i class="lg lg-data"></i>moving orange blocks = data</span>' +
          (s.ctl ? '<span><i class="lg lg-ctl"></i>teal dashes = Airflow signal</span>' : '') +
          '<span><i class="lg lg-num">1</i>step number</span></div>';
        box.innerHTML = '<div class="graph-wrap"></div><div class="cap"></div>' + legend +
          (s.steps.length > 2 ? '<button type="button" class="btn-play" data-act="auto">Play all steps</button>' : '');
        A.gctl = LAB.Graph.mount(box.querySelector('.graph-wrap'), LAB.graphs[s.g || 'master']);
        A.gctlScene = s.id;
      }
      var ids = st.pill ? [{ edge: st.pill.edge, label: st.pill.label }] : [];
      A.gctl.set({ on: st.on || [], focus: st.focus || null, pills: ids, tags: st.tags || [], show: st.show || [], status: st.status || null, keepGroups: !!st.keepGroups });
      box.querySelector('.cap').innerHTML = st.cap ? mdb(st.cap) : '';
    }
  };

  /* ---------- rows: follow one record through the layers ---------- */
  R.rows = {
    sec: 24,
    steps: function (s) { return s.steps.length; },
    say: function (s, i) { return s.steps[i].say; },
    mood: function (s, i) { return s.steps[i].mood; },
    hint: 'Look at the yellow cells. They changed. Press Next.',
    render: function (box, s, i) {
      var st = s.steps[i], h = '';
      (st.tabs || []).forEach(function (t, k) {
        if (k > 0 && st.ops && st.ops[k - 1]) h += '<div class="op"><span class="op-arrow">&darr;</span><span class="op-t">' + md(st.ops[k - 1]) + '</span></div>';
        h += '<div class="layer-tbl"><div class="layer-h"><span class="lchip c-' + (t.c || 'raw') + '">' + esc(t.layer) + '</span><span class="lname">' + esc(t.name) + '</span></div>' +
          H.table(t.cols, t.rows, { chg: t.chg, trk: t.trk }) + '</div>';
      });
      if (st.code) h += H.code({ file: st.code.file, lang: st.code.lang, code: st.code.code });
      if (st.notes && st.notes.length) {
        h += '<ul class="notes">' + st.notes.map(function (n) { return '<li>' + md(n) + '</li>'; }).join('') + '</ul>';
      }
      box.innerHTML = h;
      if (st.code) H.bindCode(box, st.code.code);
    }
  };

  /* ---------- code / sql: highlight a few lines at a time ---------- */
  function codeScene(kind) {
    return {
      sec: 26, keep: true,
      steps: function (s) { return s.steps ? s.steps.length : 1; },
      say: function (s, i) { return s.steps ? s.steps[i].say : s.say; },
      mood: function (s, i) { return s.steps ? s.steps[i].mood : s.mood; },
      hint: function (s) { return kind === 'sql' ? 'Press Run to see the result, or Next to walk through the code.' : 'The yellow lines are what Coach is explaining. Press Next.'; },
      render: function (box, s, i, A, o) {
        var st = s.steps ? s.steps[i] : {};
        var key = s.id;
        var ran = A.local[key + ':ran'] || !!st.run;
        var showC = !!st.compiled || (s.compiled && s.compiledAlways);
        if (!o.same) {
          var h = '';
          if (kind === 'sql') {
            var c = Object.assign({}, CFG.sql || {}, s.ctx || {});
            h += '<div class="wsbar"><span><b>Role</b> ' + esc(c.role || 'SYSADMIN') + '</span><span><b>Warehouse</b> ' + esc(c.wh || 'COMPUTE_WH') + '</span><span><b>Context</b> ' + esc(c.db || 'DB.SCHEMA') + '</span>' +
              (s.result ? '<button type="button" class="btn-run" data-act="run">Run</button>' : '') + '</div>';
          }
          h += '<div class="code-slot"></div>';
          h += '<div class="compiled-slot"></div>';
          if (kind === 'sql') h += '<div class="result-slot"></div>';
          if (s.note) h += '<div class="callout tip">' + md(s.note) + '</div>';
          box.innerHTML = h;
        }
        var slot = box.querySelector('.code-slot');
        slot.innerHTML = H.code({ file: s.file, lang: s.lang || (kind === 'sql' ? 'sql' : 'text'), code: s.code, hl: st.lines || null });
        H.bindCode(slot, s.code);
        var cs = box.querySelector('.compiled-slot');
        box.classList.toggle('dual', !!(s.compiled && showC));
        box.classList.toggle('has-result', kind === 'sql' && !!s.result);
        if (s.compiled && showC) {
          cs.innerHTML = '<div class="compiled-h">' + esc(s.compiled.label || 'What the engine actually receives after compiling') + '</div>' +
            H.code({ file: s.compiled.file || 'target/compiled/...', lang: s.compiled.lang || 'sql', code: s.compiled.code, hl: st.clines || null, cls: 'compiled' });
          H.bindCode(cs, s.compiled.code);
        } else cs.innerHTML = '';
        if (kind === 'sql' && s.result) {
          var rs = box.querySelector('.result-slot');
          if (ran) {
            rs.innerHTML = '<div class="result"><div class="result-h">Results <span>' + esc(s.result.msg || (s.result.rows.length + ' rows')) + '</span></div>' + H.table(s.result.cols, s.result.rows, { chg: s.result.chg, trk: s.result.trk }) + '</div>';
          } else rs.innerHTML = '';
        }
      }
    };
  }
  R.code = codeScene('code');
  R.sql = codeScene('sql');

  /* ---------- term: scripted terminal + live diagram ---------- */
  R.term = {
    sec: 40,
    steps: function () { return 1; },
    say: function (s) { return s.say; },
    mood: function (s) { return s.mood; },
    hint: 'It runs by itself. Press Replay to watch again.',
    render: function (box, s, i, A) {
      var g = s.g ? LAB.graphs[s.g] : null;
      box.innerHTML = (g ? '<div class="graph-wrap small"></div>' : '') +
        '<div class="term-tools"><span class="term-title">' + esc(s.title || 'Terminal') + '</span><span><button type="button" class="btn-sm" data-act="replay">Replay</button><button type="button" class="btn-sm" data-act="skip">Skip to end</button></span></div>' +
        '<div class="term-slot"></div>' + (s.after ? '<div class="after"></div>' : '');
      var gc = g ? LAB.Graph.mount(box.querySelector('.graph-wrap'), g) : null;
      var status = {};
      if (gc) gc.set({ status: s.initial || {} });
      var tm = LAB.Term.mount(box.querySelector('.term-slot'));
      var lines = typeof s.lines === 'function' ? s.lines() : s.lines;
      function start() {
        status = Object.assign({}, s.initial || {});
        if (gc) gc.set({ status: status, on: [] });
        var after = box.querySelector('.after');
        if (after) after.innerHTML = '';
        tm.onDone = function () { if (after && s.after) after.innerHTML = '<div class="callout ' + (s.afterKind || 'tip') + '">' + mdb(s.after) + '</div>'; if (s.doneSay) A.say(s.doneSay, s.doneMood || 'happy'); };
        tm.play(lines, function (l) {
          if (gc && l.node) { status[l.node] = l.st; gc.set({ status: status, on: l.on || [] }); }
        });
      }
      A.termCtl = { replay: start, skip: function () { tm.skip(); }, destroy: function () { tm.destroy(); } };
      start();
    }
  };

  /* ---------- cmp: comparison table, rows appear one by one ---------- */
  R.cmp = {
    sec: 24,
    steps: function (s) { return s.steps ? s.steps.length : 1; },
    say: function (s, i) { return s.steps ? s.steps[i].say : s.say; },
    mood: function (s, i) { return s.steps ? s.steps[i].mood : s.mood; },
    hint: 'Press Next to reveal the next row.',
    render: function (box, s, i) {
      var upto = s.steps ? (s.steps[i].upto || s.rows.length) : s.rows.length;
      var h = '<div class="tbl-wrap"><table class="tbl cmp"><thead><tr>' + s.cols.map(function (c, k) { return '<th class="' + (s.hl === k ? 'hlc' : '') + '">' + md(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
      s.rows.slice(0, upto).forEach(function (r, ri) {
        h += '<tr class="' + (ri === upto - 1 && s.steps ? 'fresh' : '') + '">' + r.map(function (c, ci) {
          return '<td class="' + (ci === 0 ? 'rowh ' : '') + (s.hl === ci ? 'hlc' : '') + '">' + md(c) + '</td>';
        }).join('') + '</tr>';
      });
      h += '</tbody></table></div>';
      if (s.pick && upto >= s.rows.length) h += '<div class="pick"><b>Coach\'s pick for this project</b>' + mdb(s.pick) + '</div>';
      box.innerHTML = h;
    }
  };

  /* ---------- cheat: static reference blocks ---------- */
  R.cheat = {
    sec: 45,
    steps: function () { return 1; },
    say: function (s) { return s.say; },
    mood: function () { return 'happy'; },
    hint: 'Screenshot or print this page. It is your last-minute review.',
    render: function (box, s) {
      var h = '<div class="cheat">';
      s.sections.forEach(function (sec) {
        h += '<div class="cheat-card"><h3>' + md(sec.h) + '</h3><ul>' + sec.items.map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ul></div>';
      });
      box.innerHTML = h + '</div>';
    }
  };

  /* ---------- widget dispatcher ---------- */
  R.widget = {
    sec: 40,
    steps: function (s) { var w = LAB.W[s.kind]; return w.steps ? w.steps(s) : 1; },
    say: function (s, i) { return LAB.W[s.kind].say(s, i); },
    mood: function (s, i) { var w = LAB.W[s.kind]; return w.mood ? w.mood(s, i) : 'happy'; },
    hint: function (s, i) { var h = LAB.W[s.kind].hint; return typeof h === 'function' ? h(s, i) : (h || 'Try the buttons, then press Next.'); },
    render: function (box, s, i, A, o) { LAB.W[s.kind].render(box, s, i, A, o); }
  };
})();
