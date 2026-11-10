/* Optional visit counting with GoatCounter (https://www.goatcounter.com). It does nothing until you set CODE.
   To switch it on: create a free GoatCounter site, put its site code in CODE below, and publish.
   For the site https://my-site.goatcounter.com the code is 'my-site'.

   What it sends: a page view for each page that is opened, and four named events with no personal data:
     <tutorial>/path-<id>       the path a visitor chose (Junior, Senior, Everything), once per visit
     <tutorial>/mission-<nn>    the first time a mission is reached in a visit (nn is 00 for the start)
     <tutorial>/finished        the visitor pressed Finish on the last step
   It never sends answers, scores, text or anything from the browser storage.
   It stays off on localhost and file:// pages, when the browser says Do Not Track, and for anyone who opened the
   site once with ?notrack=1 (use that on your own devices; ?notrack=0 turns counting back on). */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var CODE = '';

  var cfg = window.LAB_ANALYTICS || {};          /* tests may pass { code: 'x', force: true } */
  var code = cfg.code || CODE;
  var KEY = 'dep.notrack';
  var sent = {}, queue = [], ready = false;

  function store(op, v) {
    try { if (op === 'get') return localStorage.getItem(KEY); if (op === 'set') localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ }
    return null;
  }
  var q = /[?&]notrack=(\d)/.exec(location.search);
  if (q) { if (q[1] === '1') store('set', '1'); else store('del'); }

  function allowed() {
    if (!/^[a-z0-9-]+$/i.test(code || '')) return false;
    if (store('get') === '1') return false;
    if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return false;
    if (cfg.force) return true;
    return /^https?:$/.test(location.protocol) && !/^(localhost|127\.|\[::1\])/.test(location.hostname);
  }

  var on = allowed();
  var tut = (LAB.config && LAB.config.id) || null;
  function name(suffix) { return (tut || 'hub') + '/' + suffix; }

  function send(o) {
    if (ready && window.goatcounter && window.goatcounter.count) window.goatcounter.count(o); else queue.push(o);
  }
  function load() {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://gc.zgo.at/count.js';
    s.setAttribute('data-goatcounter', 'https://' + code + '.goatcounter.com/count');
    s.setAttribute('data-goatcounter-settings', '{"no_onload":true}');
    s.onload = function () { ready = true; while (queue.length) send(queue.shift()); };
    document.head.appendChild(s);
  }
  function once(key, o) { if (!on || sent[key]) return; sent[key] = 1; send(o); }

  LAB.analytics = {
    active: on,
    event: function (suffix, title) { once('e:' + suffix, { path: name(suffix), title: title || name(suffix), event: true }); },
    frame: function (chapter, scene) {
      if (!on) return;
      var st = LAB.app && LAB.app.state;
      if (st && st.chosen) LAB.analytics.event('path-' + st.track);
      var n = chapter && chapter.n ? ('0' + chapter.n).slice(-2) : '00';
      LAB.analytics.event('mission-' + n, chapter ? ((chapter.n ? 'Mission ' + chapter.n + ': ' : '') + chapter.title) : '');
    },
    path: function (id) { LAB.analytics.event('path-' + id); },
    finished: function () { LAB.analytics.event('finished'); }
  };

  if (!on) return;
  load();
  /* one page view for this page, using the address without index.html */
  once('view', { path: location.pathname.replace(/index\.html$/, '') || '/', title: document.title });

  /* tell visitors, on the front page only, that visits are counted */
  document.addEventListener('DOMContentLoaded', function () {
    var f = document.querySelector('body > footer');
    if (f && !tut) f.appendChild(document.createTextNode(' This site counts visits with GoatCounter, without cookies. Add ?notrack=1 to the address to opt out.'));
  });
})();
