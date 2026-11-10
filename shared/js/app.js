/* Engine: builds the frame list, draws the chrome, handles Next/Back, XP, progress, menu. Boots last. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var R = LAB.R, esc = LAB.esc, md = LAB.md, $ = LAB.$;
  var CFG = LAB.config || {};
  var KEY = CFG.storageKey || 'lab.v1';
  var TRACKS = (CFG.tracks && CFG.tracks.length) ? CFG.tracks : [
    { id: 'fast', level: 1, name: 'Fast track', text: 'The key ideas and the main exercises.' },
    { id: 'standard', level: 2, name: 'Standard track', text: 'Core topics, exercises and decisions.', rec: true },
    { id: 'all', level: 3, name: 'Everything', text: 'Every lesson, drill and follow-up.' }
  ];
  var DEFAULT_TRACK = CFG.defaultTrack || TRACKS[Math.min(1, TRACKS.length - 1)].id;
  var WIDEST_TRACK = TRACKS[TRACKS.length - 1].id;

  var DEFAULTS = { frame: null, xp: 0, seen: {}, ans: {}, ticks: {}, grades: {}, awarded: {}, track: DEFAULT_TRACK, scale: 1, chosen: false };
  var saved = LAB.store.get(KEY, null) || {};
  var state = {};
  Object.keys(DEFAULTS).forEach(function (k) { state[k] = saved[k] !== undefined ? saved[k] : JSON.parse(JSON.stringify(DEFAULTS[k])); });

  var LEVEL = {};
  TRACKS.forEach(function (t) { LEVEL[t.id] = t.level; });
  if (!LEVEL[state.track]) state.track = DEFAULT_TRACK;
  function lvl() { return LEVEL[state.track] || 2; }

  var A = (LAB.app = {
    state: state,
    local: {},
    gctl: null,
    gctlScene: null,
    save: function () { LAB.store.set(KEY, state); },
    say: function (text, mood) {
      var b = $('#bubble');
      b.innerHTML = md(text);
      LAB.coach.mood(mood || 'happy');
      LAB.coach.talk(Math.min(3200, 600 + text.length * 22));
    },
    sceneById: function (id) { return byId[id]; },
    award: function (key, pts) {
      if (state.awarded[key]) return false;
      state.awarded[key] = 1;
      state.xp += pts;
      A.save();
      updateStats();
      var p = $('#xp-pop');
      p.textContent = '+' + pts + ' XP';
      p.classList.remove('go'); void p.offsetWidth; p.classList.add('go');
      return true;
    },
    celebrate: function () {
      var cols = ['#F59E0B', '#2563EB', '#16A34A', '#DB2777', '#7C3AED', '#0EA5E9'];
      for (var i = 0; i < 46; i++) {
        var d = document.createElement('i');
        d.className = 'confetti';
        d.style.left = Math.random() * 100 + 'vw';
        d.style.background = cols[i % cols.length];
        d.style.animationDelay = (Math.random() * 0.5) + 's';
        d.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
        document.body.appendChild(d);
        (function (el) { setTimeout(function () { el.remove(); }, 2600); })(d);
      }
    },
    render: function (refresh) { renderFrame(!!refresh); },
    goScene: function (id) {
      for (var i = 0; i < frames.length; i++) if (frames[i].sc.id === id) { go(i); return; }
      /* not in this track: open the full course, then jump */
      state.track = WIDEST_TRACK; A.save(); buildFrames();
      for (var j = 0; j < frames.length; j++) if (frames[j].sc.id === id) { go(j); return; }
    },
    hasMock: function (qid) {
      for (var i = 0; i < frames.length; i++) if (frames[i].sc.type === 'mock' && frames[i].sc.qid === qid) return true;
      return false;
    },
    missionMinutes: function (ci) {
      var t = 0;
      for (var i = 0; i < frames.length; i++) if (frames[i].ch === ci) t += frames[i].sec;
      return Math.max(1, Math.round(t / 60));
    },
    setTrack: function (t) {
      var key = frames[idx] ? frames[idx].key : null;
      state.track = t; state.chosen = true; A.save();
      if (LAB.analytics) LAB.analytics.path(t);
      buildFrames();
      var j = key ? findKey(key) : 0;
      idx = j >= 0 ? j : nearestAfter(key);
      renderFrame(false);
    },
    bindWidget: null,
    termCtl: null,
    timerId: null
  });

  var frames = [], idx = 0, byId = {}, lastScene = null, autoTimer = null;

  /* ---------- frames ---------- */
  function secOf(sc, i) {
    var r = R[sc.type];
    if (sc.type === 'qa') return [70, 45, 25][i];
    if (sc.type === 'mock') return [95, 35][i];
    if (sc.type === 'incident') return [50, 40, 45][i];
    return r.sec || 25;
  }
  function buildFrames() {
    frames = [];
    byId = {};
    /* boss-round numbering follows the questions that are in the chosen path */
    var mocks = [];
    LAB.chapters.forEach(function (ch) { ch.scenes.forEach(function (sc) { if (sc.type === 'mock' && (sc.t || 3) <= lvl()) mocks.push(sc); }); });
    mocks.forEach(function (sc, k) { sc.k = k + 1; sc.of = mocks.length; });
    LAB.chapters.forEach(function (ch) {
      ch.scenes.forEach(function (sc) {
        byId[sc.id] = sc;
        if ((sc.t || 3) > lvl()) return;
        var r = R[sc.type];
        var n = r.steps(sc);
        for (var i = 0; i < n; i++) frames.push({ ch: ch.index, sc: sc, i: i, n: n, key: sc.id + ':' + i, sec: secOf(sc, i) });
      });
    });
  }
  function findKey(key) {
    for (var i = 0; i < frames.length; i++) if (frames[i].key === key) return i;
    return -1;
  }
  function nearestAfter(key) {
    if (!key) return 0;
    var sid = key.split(':')[0], found = false;
    /* walk all scenes in order; return first included frame at or after the scene */
    for (var c = 0; c < LAB.chapters.length; c++) {
      var sc = LAB.chapters[c].scenes;
      for (var s = 0; s < sc.length; s++) {
        if (sc[s].id === sid) found = true;
        if (found) { var j = frames.findIndex(function (f) { return f.sc.id === sc[s].id; }); if (j >= 0) return j; }
      }
    }
    return frames.length - 1;
  }

  /* ---------- welcome screen (path choice) ---------- */
  R.welcome = {
    sec: 40,
    steps: function () { return 1; },
    say: function () { return (CFG.welcome && CFG.welcome.say) || 'Hi, I am Coach ' + ((CFG.coach && CFG.coach.name) || 'Sam') + '. I will walk you through this step by step. You only need the Next button. First, tell me which path fits you.'; },
    mood: function () { return 'cheer'; },
    hint: 'Pick a path. Then press Next.',
    render: function (box) {
      var W = CFG.welcome || {};
      var c = trackCounts();
      var rh = (CFG.rhythm || [
        { k: 'see', b: 'SEE', t: 'Watch the data move' },
        { k: 'try', b: 'TRY', t: 'Quizzes, bug hunts, exercises' },
        { k: 'say', b: 'SAY', t: 'Answer interview questions out loud' }
      ]).map(function (r) { return '<div class="rh ' + esc(r.k) + '"><b>' + esc(r.b) + '</b><span>' + esc(r.t) + '</span></div>'; }).join('');
      box.innerHTML = '<div class="welcome"><div class="w-title">' + (W.titleHtml || 'Welcome') + '</div>' +
        (W.sub ? '<p class="w-sub">' + esc(W.sub) + '</p>' : '') +
        '<div class="rhythm">' + rh + '</div>' +
        '<h3 class="qh">' + esc(W.question || 'How much time do you have?') + '</h3><div class="tracks">' +
        TRACKS.map(function (t) {
          return '<button type="button" class="track' + (state.track === t.id ? ' on' : '') + '" data-t="' + esc(t.id) + '"><b>About ' + c[t.id].text + '</b><span class="tname">' + esc(t.name) + (t.rec ? ' <i>recommended</i>' : '') + '</span><span>' + esc(t.text) + '</span></button>';
        }).join('') + '</div><p class="w-note">' + esc(W.note || 'Switch any time from the Map button. Progress saves in this browser.') + '</p></div>';
      Array.prototype.forEach.call(box.querySelectorAll('.track'), function (b) {
        b.onclick = function () { A.setTrack(b.getAttribute('data-t')); };
      });
    }
  };
  function trackCounts() {
    var tot = {};
    TRACKS.forEach(function (t) { tot[t.id] = 0; });
    LAB.chapters.forEach(function (ch) {
      ch.scenes.forEach(function (sc) {
        var r = R[sc.type], n = r.steps(sc), t = sc.t || 3;
        for (var i = 0; i < n; i++) {
          var sx = secOf(sc, i);
          TRACKS.forEach(function (tr) { if (t <= tr.level) tot[tr.id] += sx; });
        }
      });
    });
    function fmt(sec) { var m = Math.round(sec / 60 / 5) * 5; return m >= 120 ? (Math.round(m / 30) / 2) + ' hours' : m + ' minutes'; }
    var out = {};
    TRACKS.forEach(function (t) { out[t.id] = { text: fmt(tot[t.id]), min: Math.round(tot[t.id] / 60) }; });
    return out;
  }

  /* ---------- chrome ---------- */
  var SEG = { see: ['SEE', 'Watch'], try: ['TRY', 'Practice'], say: ['SAY', 'Interview'], meta: ['MISSION', ''] };
  var DEFAULT_TITLE = { quiz: 'Quick check', bug: 'Bug hunt', order: 'Put it in order', decide: 'Architecture decision', challenge: 'Coding round', incident: 'Incident drill', qa: 'Interview question', mock: 'Boss round', score: 'Your scorecard', recap: 'Mission recap', cheat: 'Cheat sheet', welcome: 'Welcome' };
  var LEVELS = CFG.levels || ['Rookie', 'Learner', 'Practitioner', 'Builder', 'Specialist', 'Senior', 'Expert'];

  function completedMissions() {
    var n = 0;
    LAB.chapters.forEach(function (ch) {
      ch.scenes.forEach(function (sc) { if (sc.type === 'recap' && state.awarded['recap:' + sc.id]) n++; });
    });
    return n;
  }
  function minutesLeft() {
    var s = 0;
    for (var i = idx; i < frames.length; i++) s += frames[i].sec;
    return Math.max(1, Math.round(s / 60));
  }
  function updateStats() {
    $('#xp').textContent = state.xp;
    var done = completedMissions();
    $('#lvl').textContent = LEVELS[Math.min(done, LEVELS.length - 1)];
    if (frames.length) {
      $('#left').textContent = idx >= frames.length - 1 ? 'Done' : '~' + minutesLeft() + ' min left';
    }
  }
  function drawSegments() {
    var seen = state.seen, total = frames.length;
    var perCh = {};
    frames.forEach(function (f, i) { var c = perCh[f.ch] || (perCh[f.ch] = { n: 0, seen: 0, first: i }); c.n++; if (seen[f.key]) c.seen++; });
    var h = '';
    LAB.chapters.forEach(function (ch) {
      var c = perCh[ch.index]; if (!c) return;
      var cur = frames[idx] && frames[idx].ch === ch.index;
      h += '<button type="button" class="seg' + (cur ? ' cur' : '') + '" style="flex:' + c.n + '" data-first="' + c.first + '" title="' + esc((ch.n ? 'Mission ' + ch.n + ': ' : '') + ch.title) + '"><i style="width:' + Math.round(c.seen / c.n * 100) + '%"></i></button>';
    });
    $('#segs').innerHTML = h;
    Array.prototype.forEach.call($('#segs').querySelectorAll('.seg'), function (b) { b.onclick = function () { go(+b.getAttribute('data-first')); }; });
  }

  /* ---------- render a frame ---------- */
  function renderFrame(refresh) {
    var f = frames[idx];
    if (!f) return;
    var sc = f.sc, r = R[sc.type];
    var sameScene = lastScene === sc.id;
    if (!refresh) {
      stopAuto(!sameScene);
      clearInterval(A.timerId);
      if (A.termCtl) { A.termCtl.destroy(); A.termCtl = null; }
      A.bindWidget = null;
      Array.prototype.forEach.call(document.querySelectorAll('.confetti'), function (c) { c.remove(); });
    }
    var body = $('#stage-body');
    var keepDom = r.keep && sameScene;
    if (!refresh && !keepDom) { body.innerHTML = ''; body.classList.remove('dual', 'has-result'); A.gctl = null; A.gctlScene = null; }

    /* header of the stage */
    var segKey = sc.type === 'intro' ? 'meta' : (r.seg || 'see');
    var ch = LAB.chapters[f.ch];
    var chip = $('#seg-chip');
    chip.className = 'seg-chip s-' + segKey;
    chip.textContent = SEG[segKey][0];
    var tc = $('#tier-chip');
    if (tc) {
      var tl = (CFG.tierLabels || {})[sc.t];
      tc.textContent = tl || '';
      tc.style.display = tl ? '' : 'none';
      tc.className = 'tier-chip tier-' + (sc.t || 3);
      /* optional second chip: where the content of this screen comes from (CFG.srcLabels, scene field src) */
      var srcChip = document.getElementById('src-chip');
      if (!srcChip) { srcChip = document.createElement('span'); srcChip.id = 'src-chip'; tc.parentNode.insertBefore(srcChip, tc.nextSibling); }
      var sl = (CFG.srcLabels || {})[sc.src];
      srcChip.textContent = sl || '';
      srcChip.style.display = sl ? '' : 'none';
      srcChip.className = 'src-chip src-' + (sc.src || 'none');
    }
    var title = sc.title || (sc.type === 'intro' ? 'Mission ' + sc.n + ': ' + sc.title : DEFAULT_TITLE[sc.type] || '');
    if (sc.type === 'intro') title = ch.n ? 'Mission ' + ch.n + ': ' + ch.title : ch.title;
    $('#stage-title').textContent = title;
    $('#crumb').textContent = ch.n ? 'Mission ' + ch.n + ' of ' + LAB.chapters.filter(function (c) { return c.n; }).length + '  ·  ' + ch.short : ch.short;

    r.render(body, sc, f.i, A, { same: keepDom || (refresh && r.keep) });

    if (!refresh) {
      var said = r.say(sc, f.i);
      if (said) A.say(said, r.mood ? (r.mood(sc, f.i) || 'happy') : 'happy');
      var hint = typeof r.hint === 'function' ? r.hint(sc, f.i) : r.hint;
      $('#hint').textContent = hint || 'Press Next.';
      state.frame = f.key;
      if (!state.seen[f.key]) { state.seen[f.key] = 1; A.award('seen:' + f.key, 1); }
      A.save();
      lastScene = sc.id;
      if (LAB.analytics) LAB.analytics.frame(ch, sc);
      try { history.replaceState(null, '', '#' + f.key); } catch (e) { /* file:// in some browsers */ }
      window.scrollTo(0, 0);
    }

    /* footer */
    var last = idx >= frames.length - 1;
    var nl = r.nextLabel ? r.nextLabel(sc, f.i) : null;
    $('#next-label').textContent = last ? 'Finish' : (nl || 'Next');
    $('#back').disabled = idx === 0;
    var inCh = frames.filter(function (x) { return x.ch === f.ch; });
    var posIn = inCh.indexOf(f) + 1;
    $('#pos').textContent = 'Step ' + posIn + ' of ' + inCh.length;
    updateStats();
    drawSegments();
  }

  /* ---------- navigation ---------- */
  function go(i) {
    if (i < 0 || i >= frames.length) return;
    idx = i;
    renderFrame(false);
  }
  function next() {
    if (idx < frames.length - 1) go(idx + 1);
    else { if (LAB.analytics) LAB.analytics.finished(); A.celebrate(); openMenu(); }
  }
  function back() { if (idx > 0) go(idx - 1); }

  function stopAuto(force) {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    var b = document.querySelector('.btn-play'); if (b) b.textContent = 'Play all steps';
  }
  function toggleAuto() {
    if (autoTimer) { stopAuto(); return; }
    var b = document.querySelector('.btn-play'); if (b) b.textContent = 'Pause';
    autoTimer = setInterval(function () {
      var cur = frames[idx], nx = frames[idx + 1];
      if (!nx || nx.sc.id !== cur.sc.id) { stopAuto(); return; }
      idx++;
      var keep = autoTimer; /* renderFrame(false) calls stopAuto; restore it */
      renderFrame(false);
      autoTimer = keep;
      var pb = document.querySelector('.btn-play'); if (pb) pb.textContent = 'Pause';
    }, 4600);
  }

  /* ---------- menu ---------- */
  function openMenu() {
    var perCh = {};
    frames.forEach(function (f, i) { var c = perCh[f.ch] || (perCh[f.ch] = { n: 0, seen: 0, first: i }); c.n++; if (state.seen[f.key]) c.seen++; });
    var tcounts = trackCounts();
    var h = '<div class="menu-card" role="dialog" aria-label="Mission map"><div class="menu-h"><h2>Mission map</h2><button type="button" class="btn-sm" data-m="close">Close</button></div>' +
      '<div class="menu-tools"><span>Path:</span>' + TRACKS.map(function (t) { return '<button type="button" class="tg' + (state.track === t.id ? ' on' : '') + '" data-m="track:' + esc(t.id) + '">' + esc(t.name) + ' (' + tcounts[t.id].text + ')</button>'; }).join('') + '</div><div class="mlist">';
    LAB.chapters.forEach(function (ch) {
      var c = perCh[ch.index]; if (!c) return;
      var pct = Math.round(c.seen / c.n * 100);
      h += '<button type="button" class="mrow' + (frames[idx] && frames[idx].ch === ch.index ? ' cur' : '') + '" data-first="' + c.first + '"><span class="mn">' + (ch.n || 'Go') + '</span><span class="mt"><b>' + esc(ch.title) + '</b><small>' + esc(ch.blurb || '') + '</small></span><span class="mmin">' + A.missionMinutes(ch.index) + ' min</span><span class="mp"><i style="width:' + pct + '%"></i></span><span class="mpc">' + pct + '%</span></button>';
    });
    h += '</div><div class="menu-foot"><button type="button" class="btn-sm" data-m="reset">Reset all progress</button></div></div>';
    var o = $('#overlay');
    o.innerHTML = h;
    o.classList.add('open');
    Array.prototype.forEach.call(o.querySelectorAll('.mrow'), function (b) { b.onclick = function () { closeMenu(); go(+b.getAttribute('data-first')); }; });
    o.onclick = function (e) {
      var m = e.target.getAttribute && e.target.getAttribute('data-m');
      if (e.target === o || m === 'close') closeMenu();
      if (m && m.indexOf('track:') === 0) { closeMenu(); A.setTrack(m.slice(6)); }
      if (m === 'reset') {
        if (confirm('Erase all progress, XP and answers in this browser?')) { LAB.store.del(KEY); location.hash = ''; location.reload(); }
      }
    };
  }
  function closeMenu() { var o = $('#overlay'); o.classList.remove('open'); o.innerHTML = ''; }

  /* ---------- text size ---------- */
  function applyScale() {
    document.documentElement.style.setProperty('--scale', state.scale);
  }
  function bump(d) {
    state.scale = Math.max(0.85, Math.min(1.4, Math.round((state.scale + d) * 100) / 100));
    applyScale(); A.save();
  }

  /* ---------- global events ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!t) return;
    var act = t.getAttribute('data-act');
    var f = frames[idx];
    if (act === 'run' && f) {
      A.local[f.sc.id + ':ran'] = true; renderFrame(true);
      var rs = document.querySelector('.result-slot .result');
      if (rs && rs.scrollIntoView) rs.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    else if (act === 'replay' && A.termCtl) A.termCtl.replay();
    else if (act === 'skip' && A.termCtl) A.termCtl.skip();
    else if (act === 'auto') toggleAuto();
    else if (A.bindWidget) A.bindWidget(act, t);
  });
  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if ($('#overlay').classList.contains('open')) { if (e.key === 'Escape') closeMenu(); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); back(); }
  });
  window.addEventListener('hashchange', function () {
    var k = decodeURIComponent(location.hash.slice(1));
    var j = findKey(k);
    if (j >= 0 && j !== idx) go(j);
  });

  /* ---------- boot ---------- */
  function boot() {
    LAB.coach.mount($('#coach-photo'));
    buildFrames();
    var start = decodeURIComponent((location.hash || '').slice(1)) || state.frame;
    var j = start ? findKey(start) : -1;
    idx = j >= 0 ? j : 0;
    applyScale();
    $('#next').onclick = next;
    $('#back').onclick = back;
    $('#menu-btn').onclick = openMenu;
    $('#fs-down').onclick = function () { bump(-0.08); };
    $('#fs-up').onclick = function () { bump(0.08); };
    renderFrame(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
