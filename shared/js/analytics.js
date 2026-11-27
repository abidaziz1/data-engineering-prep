/* Aggregate analytics for the static library, using the existing GoatCounter account.
   No cookies, user IDs, answers, grades, code or saved learning state are sent.
   DNT, Global Privacy Control and ?notrack=1 disable collection. ?notrack=0 opts in.
   Session events are deduplicated in this tab for 30 minutes of inactivity; these
   are aggregate navigation reach signals, not verified learning or a person-level funnel.
   Read shared/analytics.html and docs/ANALYTICS.md for definitions and limits. */
(function () {
  'use strict';
  var LAB = window.LAB = window.LAB || {};
  var CODE = 'abidaziz';
  var cfg = window.LAB_ANALYTICS || {};
  var code = cfg.code || CODE;
  var OPT = 'dep.notrack', SESSION = 'dep.analytics.v2', IDLE = 30 * 60 * 1000;
  var COURSES = 'ai airflow aws azure bi databricks dbt docker fabric flink gcp git ingestion java kafka kubernetes mongodb postgresql project-cdc project-elt project-lakehouse python scala snowflake snowflake-dbt spark sql'.split(' ');
  var KINDS = 'quiz bug order decision challenge-hint challenge-solution interview-answer interview-timer interview-followup interview-review lab code-copy sql-run'.split(' ');
  var tut = LAB.config && LAB.config.id;
  if (COURSES.indexOf(tut) < 0) tut = null;
  var tracks = ((LAB.config && LAB.config.tracks) || []).map(function (t) { return t.id; });
  var scope = tut || 'hub', ready = false, failed = false, queue = [], pageSent = false;
  var interval = null, lastTick = 0, lastActivity = 0, lastPersist = 0;
  var session = { v: 2, last: 0, sent: {}, engaged: {} };
  function now() { return typeof cfg.now === 'function' ? cfg.now() : Date.now(); }
  function opt(op, value) {
    try { if (op === 'get') return localStorage.getItem(OPT); if (op === 'set') localStorage.setItem(OPT, value); else localStorage.removeItem(OPT); } catch (e) { /* privacy storage may be blocked */ }
    return null;
  }
  var query = /[?&]notrack=(\d)(?:&|$)/.exec(location.search);
  if (query) { if (query[1] === '1') opt('set', '1'); else if (query[1] === '0') opt('del'); }
  function allowed() {
    if (!/^[a-z0-9-]+$/i.test(code || '')) return false;
    if (opt('get') === '1' || query && query[1] === '1') return false;
    if (navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true) return false;
    if (cfg.force === true) return true;
    return /^https?:$/.test(location.protocol) && !/^(localhost|127\.|0\.0\.0\.0$|\[?::1\]?$)/i.test(location.hostname);
  }
  var on = allowed();
  function fresh(t) { return { v: 2, last: t, sent: {}, engaged: {} }; }
  function readSession() {
    try {
      var s = JSON.parse(sessionStorage.getItem(SESSION) || 'null');
      if (s && s.v === 2 && typeof s.last === 'number' && isFinite(s.last) && s.sent && typeof s.sent === 'object' && !Array.isArray(s.sent) && s.engaged && typeof s.engaged === 'object' && !Array.isArray(s.engaged) && now() - s.last < IDLE && now() >= s.last) {
        session = fresh(s.last);
        Object.keys(s.sent).slice(0, 5000).forEach(function (key) {
          if (/^[a-z0-9-]+:e:[a-z0-9][a-z0-9/_-]{0,159}$/i.test(key) && s.sent[key] === 1) session.sent[key] = 1;
        });
        COURSES.forEach(function (id) {
          var value = s.engaged[id];
          if (typeof value === 'number' && isFinite(value) && value >= 0) session.engaged[id] = Math.min(value, 86400000);
        });
      }
    } catch (e) { /* in-memory dedupe still works */ }
    if (!session.last) session = fresh(now());
  }
  function current() {
    var t = now();
    if (t < session.last || t - session.last >= IDLE) session = fresh(t);
    return session;
  }
  function persist(force) {
    if (!on) return;
    var t = now();
    if (!force && t - lastPersist < 5000) return;
    try { sessionStorage.setItem(SESSION, JSON.stringify(session)); } catch (e) { /* no persistent identifiers or fallback cookies */ }
    lastPersist = t;
  }
  function name(suffix) { return scope + '/' + suffix; }
  function count(hit) {
    if (failed || !on) return false;
    if (ready && window.goatcounter && typeof window.goatcounter.count === 'function') {
      try { window.goatcounter.count(hit); return true; } catch (e) { return false; /* telemetry must never break a lesson */ }
    }
    if (queue.length < 100) { queue.push(hit); return true; }
    return false;
  }
  function once(key, hit) {
    if (!on || failed) return;
    var s = current(), k = scope + ':' + key;
    if (s.sent[k]) return;
    if (count(hit)) { s.sent[k] = 1; persist(true); }
  }
  function event(suffix, title) {
    if (!/^[a-z0-9][a-z0-9/_-]{0,159}$/i.test(suffix || '')) return;
    once('e:' + suffix, { path: name(suffix), title: title || name(suffix), event: true });
  }
  function track() {
    var s = LAB.app && LAB.app.state;
    return s && s.chosen && tracks.indexOf(s.track) >= 0 ? s.track : null;
  }
  function trackEvent(suffix, title) {
    event(suffix, title);
    var t = track();
    if (t) event('track-' + t + '/' + suffix, title + ' (' + t + ' path)');
  }
  function missionNumber(ch) {
    var n = ch && Number(ch.n);
    return isFinite(n) && n >= 0 && n < 100 ? ('0' + Math.floor(n)).slice(-2) : '00';
  }
  function milestones(value, total, prefix, label) {
    value = Number(value); total = Number(total);
    if (!(total > 0) || !(value >= 1)) return;
    var pct = Math.min(100, value / total * 100);
    [25, 50, 75, 100].forEach(function (n) {
      if (pct >= n) trackEvent(prefix + '-' + n, label + ' ' + n + '% (position reached, not reading or learning completion)');
    });
  }
  function visible() {
    return document.visibilityState !== 'hidden' && (!document.hasFocus || document.hasFocus());
  }
  function tick() {
    var t = now(), elapsed = Math.max(0, Math.min(10000, t - lastTick));
    lastTick = t;
    if (!on || !tut || !visible() || t - lastActivity > 60000 || t - lastActivity < 0) return;
    var s = current();
    s.engaged[scope] = Math.max(0, Number(s.engaged[scope]) || 0) + elapsed;
    [15, 60, 300, 900, 1800].forEach(function (sec) {
      if (s.engaged[scope] >= sec * 1000) event('active-' + sec + 's', 'At least ' + sec + ' seconds of active, visible, focused time in this tab session');
    });
    persist(false);
  }
  function activity() {
    if (!on) return;
    tick(); current(); lastActivity = now(); session.last = lastActivity; persist(false);
  }
  function campaignQuery() {
    var permitted = ['utm_campaign', 'campaign', 'utm_source', 'ref', 'src', 'source', 'utm_medium'];
    var out = [];
    try {
      var params = new URLSearchParams(location.search);
      permitted.forEach(function (key) {
        var value = params.get(key);
        if (value && /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(value)) out.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
      });
    } catch (e) { /* omit all query parameters if parsing fails */ }
    return out.length ? '?' + out.join('&') : '';
  }
  function safeReferrer(value) {
    try { var u = new URL(value); return /^https?:$/.test(u.protocol) ? u.origin + '/' : ''; } catch (e) { return ''; }
  }
  function scrubVendor() {
    var gc = window.goatcounter;
    if (!gc || typeof gc.get_data !== 'function') return false;
    var original = gc.get_data;
    gc.get_data = function () {
      var data = original.apply(this, arguments);
      if (data && typeof data === 'object') {
        data.q = campaignQuery();
        data.r = safeReferrer(data.r);
      }
      return data;
    };
    return true;
  }
  function discardQueue() {
    queue.forEach(function (hit) {
      if (hit.event === true && hit.path.indexOf(scope + '/') === 0) delete session.sent[scope + ':e:' + hit.path.slice(scope.length + 1)];
    });
    queue = []; persist(true);
  }
  function load() {
    var script = document.createElement('script');
    script.async = true; script.src = 'https://gc.zgo.at/count.js';
    script.setAttribute('data-goatcounter', 'https://' + code + '.goatcounter.com/count');
    script.setAttribute('data-goatcounter-settings', '{"no_onload":true}');
    script.onload = function () {
      if (!scrubVendor()) { failed = true; discardQueue(); return; }
      ready = true;
      var pending = queue.slice(); queue = [];
      pending.forEach(function (hit) {
        if (!count(hit) && hit.event === true && hit.path.indexOf(scope + '/') === 0) delete session.sent[scope + ':e:' + hit.path.slice(scope.length + 1)];
      });
      persist(true);
    };
    script.onerror = function () { failed = true; discardQueue(); };
    document.head.appendChild(script);
  }
  LAB.analytics = {
    active: on,
    status: function () { return { enabled: on, loaded: ready, failed: failed, queued: queue.length }; },
    event: event,
    frame: function (chapter, scene, progress) {
      if (!on) return;
      var t = track(), n = missionNumber(chapter);
      if (t) event('path-' + t);
      event('mission-' + n, chapter ? ((chapter.n ? 'Mission ' + chapter.n + ': ' : '') + chapter.title) : '');
      if (t) event('track-' + t + '/mission-' + n, 'Reached mission ' + n + ' (' + t + ' path)');
      if (chapter && chapter.n > 0) trackEvent('course-started', 'Reached a numbered mission (may include a map jump)');
      if (progress && t) {
        milestones(progress.index, progress.total, 'progress', 'Course navigation position reached');
        milestones(progress.missionIndex, progress.missionTotal, 'mission-' + n + '/progress', 'Mission ' + n + ' navigation position reached');
      }
    },
    path: function (id) { if (tracks.indexOf(id) >= 0) event('path-' + id); },
    finished: function () { event('finished', 'Finish button clicked (legacy event; not verified full-course completion)'); trackEvent('finish-clicked', 'Finish button clicked (may follow a map jump)'); },
    missionComplete: function (ch) { trackEvent('mission-end-' + missionNumber(ch), 'Advanced past the final frame of mission ' + missionNumber(ch) + ' (not verified learning completion)'); },
    interaction: function (kind) { if (KINDS.indexOf(kind) >= 0) trackEvent('interaction-' + kind, 'Used ' + kind + ' (no answer, result or grade collected)'); },
    hubOpen: function (destination) { if (!tut && COURSES.indexOf(destination) >= 0) event('open-' + destination, 'Opened ' + destination + ' from the library'); }
  };
  function notice() {
    var footer = document.querySelector('body > footer');
    if (!footer || tut) return;
    footer.appendChild(document.createTextNode(' This site counts visits and aggregate learning interactions with GoatCounter, without cookies. '));
    var a = document.createElement('a'); a.href = 'shared/analytics.html'; a.textContent = 'Analytics and privacy'; footer.appendChild(a);
    footer.appendChild(document.createTextNode(' Add ?notrack=1 to the address to opt out.'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', notice); else notice();
  // A preference changed on the privacy page stops already-open lesson tabs.
  window.addEventListener('storage', function (e) {
    if (e.key !== OPT || e.newValue !== '1') return;
    on = false; LAB.analytics.active = false; queue = [];
    if (interval !== null) { window.clearInterval(interval); interval = null; }
    try { sessionStorage.removeItem(SESSION); } catch (err) { /* storage may be blocked */ }
  });
  if (!on) return;
  readSession(); load();
  // A genuine document load remains a page view, even within the same tab session.
  if (!pageSent) { pageSent = true; count({ path: location.pathname.replace(/index\.html$/, '') || '/', title: document.title }); }
  event('course-opened', tut ? 'Opened ' + tut + ' tutorial' : 'Opened the tutorial library');
  lastActivity = lastTick = now();
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(function (type) { document.addEventListener(type, activity, { passive: true, capture: true }); });
  interval = window.setInterval(tick, 5000);
  document.addEventListener('visibilitychange', function () { tick(); lastTick = now(); persist(true); });
  window.addEventListener('blur', function () { tick(); lastTick = now(); persist(true); });
  window.addEventListener('focus', function () { lastTick = now(); activity(); });
  window.addEventListener('pagehide', function () { tick(); persist(true); });
  if (!tut) document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a.card.ready[href]');
    if (!link) return;
    try {
      var url = new URL(link.getAttribute('href'), location.href);
      if (url.origin !== location.origin || url.search || url.hash) return;
      var m = /\/([a-z0-9-]+)\/(?:index\.html)?$/.exec(url.pathname);
      if (m) LAB.analytics.hubOpen(m[1]);
    } catch (err) { /* malformed links cannot create arbitrary telemetry */ }
  }, true);
  if (!tut) document.addEventListener('scroll', function () {
    var el = document.documentElement, height = el.scrollHeight - el.clientHeight;
    if (!(height > 0)) return;
    var pct = (window.scrollY || el.scrollTop || 0) / height * 100;
    [25, 50, 75, 90].forEach(function (n) { if (pct >= n) event('scroll-' + n, 'Library scroll depth reached ' + n + '%'); });
  }, { passive: true });
})();
