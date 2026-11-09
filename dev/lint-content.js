// Content lint for one tutorial: ids, tiers, code ranges, quiz indexes, diagram references,
// answer lengths and the writing-style rules.
// Run: node dev/lint-content.js snowflake [-v]
const fs = require('fs'), path = require('path');
const name = process.argv.slice(2).find(a => !a.startsWith('-')) || 'snowflake';
const verbose = process.argv.includes('-v');
global.window = global; global.LAB = {};
const shared = path.join(__dirname, '..', 'shared', 'js') + '/';
const tut = path.join(__dirname, '..', name, 'js') + '/';
const load = f => { (0, eval)(fs.readFileSync(f, 'utf8')); };
load(tut + 'config.js');
load(shared + 'graph.js');
load(tut + 'graphs.js');
load(shared + 'build.js');
fs.readdirSync(tut + 'content').filter(f => f.endsWith('.js')).sort().forEach(f => load(tut + 'content/' + f));

let problems = 0;
const bad = m => { problems++; console.log('PROBLEM:', m); };

// every content file must be loaded by the tutorial page
const html = fs.readFileSync(path.join(__dirname, '..', name, 'index.html'), 'utf8');
fs.readdirSync(tut + 'content').filter(f => f.endsWith('.js')).forEach(f => { if (!html.includes('js/content/' + f)) bad('index.html does not load js/content/' + f); });

// ---------- writing style (the same rules for every tutorial) ----------
const BANNED = /\b(elevate[sd]?|hustle|revolutioniz\w*|fostering|reimagin\w*|subsequently|showcas\w*|profound\w*|groundbreaking|delve[sd]?|synerg\w*|insights?|whisper\w*|enablement|meanwhile|game[- ]?changer|deep[- ]dive|leverag\w*|unleash\w*|harness\w*|paradigm\w*|ecosystem\w*|cross-functional|think outside the box|touch ?points?|across different|human oversight|to bridge|highlight\w*)\b/i;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2705}\u{274C}]/u;
const strings = [];
(function walk(o, p) {
  if (typeof o === 'string') strings.push([p, o]);
  else if (Array.isArray(o)) o.forEach((x, i) => walk(x, p + '[' + i + ']'));
  else if (o && typeof o === 'object') Object.keys(o).forEach(k => walk(o[k], p + '.' + k));
})(LAB.chapters, 'ch');
strings.push(['config.welcome', JSON.stringify(LAB.config.welcome)], ['config.tracks', JSON.stringify(LAB.config.tracks)]);
strings.forEach(([p, s]) => {
  if (/\.(code|sol|starter|fix|q)$/.test(p) || /\.compiled(\.code)?$/.test(p) || /\.code\.code$/.test(p)) { if (/—/.test(s)) bad('em dash in code ' + p); return; }
  let m;
  if ((m = s.match(BANNED))) bad('banned word "' + m[0] + '" at ' + p + ': ' + s.slice(0, 80));
  if (/—| – | -- /.test(s)) bad('dash at ' + p + ': ' + s.slice(0, 80));
  if (EMOJI.test(s)) bad('emoji at ' + p);
  if (/\bnot only\b/i.test(s)) bad('"not only" at ' + p);
  if (/\bThat's not\b|\bThat is not\b.*\bIt's\b/.test(s)) bad('"That is not X. It is Y" at ' + p + ': ' + s.slice(0, 80));
  if (/(^|[.!?] )From [^.,]{1,50} to /.test(s)) bad('"From X to Y" at ' + p + ': ' + s.slice(0, 80));
  if (/Why it matters/i.test(s)) bad('Why it matters at ' + p);
});

// ---------- diagram specs ----------
const G = LAB.graphs || {};
Object.keys(G).forEach(gk => {
  const g = G[gk], ids = new Set(), edgeIds = new Set(), tagIds = new Set();
  (g.nodes || []).forEach(n => { if (ids.has(n.id)) bad('graph ' + gk + ': duplicate node ' + n.id); ids.add(n.id); if (n.x < -1 || n.y < -1 || n.x + n.w > g.w + 1 || n.y + n.h > g.h + 1) bad('graph ' + gk + ': node ' + n.id + ' outside the canvas'); });
  (g.groups || []).forEach(n => ids.add(n.id));
  (g.edges || []).forEach(e => { if (edgeIds.has(e.id)) bad('graph ' + gk + ': duplicate edge ' + e.id); edgeIds.add(e.id); if (!ids.has(e.a) || !ids.has(e.b)) bad('graph ' + gk + ': edge ' + e.id + ' has an unknown end ' + e.a + ' / ' + e.b); });
  (g.tags || []).forEach(t => tagIds.add(t.id));
  G[gk]._ids = ids; G[gk]._edges = edgeIds; G[gk]._tags = tagIds;
});
const checkStep = (where, g, st) => {
  if (!g) return;
  (st.on || []).forEach(e => { if (!g._edges.has(e)) bad(where + ': unknown edge "' + e + '"'); });
  (st.focus || []).forEach(n => { if (!g._ids.has(n)) bad(where + ': unknown focus node "' + n + '"'); });
  (st.tags || []).forEach(t => { if (!g._tags.has(t)) bad(where + ': unknown tag "' + t + '"'); });
  (st.show || []).forEach(n => { if (!g._ids.has(n)) bad(where + ': unknown show group "' + n + '"'); });
  Object.keys(st.status || {}).forEach(n => { if (!g._ids.has(n)) bad(where + ': unknown status node "' + n + '"'); });
  if (st.pill && !g._edges.has(st.pill.edge)) bad(where + ': unknown pill edge "' + st.pill.edge + '"');
};

// ---------- scenes ----------
const ids = new Set();
let perType = {}, perTier = { 1: 0, 2: 0, 3: 0 };
const widgetKinds = new Set();
LAB.chapters.forEach(ch => {
  if (!ch.scenes.some(s => s.type === 'recap') && ch.n) bad(ch.id + ' has no recap');
  ch.scenes.forEach(sc => {
    if (ids.has(sc.id)) bad('duplicate id ' + sc.id); ids.add(sc.id);
    perType[sc.type] = (perType[sc.type] || 0) + 1;
    const where = ch.id + '/' + sc.id;
    if (![1, 2, 3].includes(sc.t)) bad(where + ' needs a tier t of 1, 2 or 3 (has ' + sc.t + ')');
    else perTier[sc.t]++;
    if (sc.type === 'flow' || sc.type === 'term') {
      const g = G[sc.g || (sc.type === 'flow' ? 'master' : '')];
      if (!g && (sc.type === 'flow' || sc.g)) bad(where + ' unknown diagram "' + sc.g + '"');
      if (sc.type === 'flow') (sc.steps || []).forEach((st, i) => { checkStep(where + ' step ' + i, g, st); if (!st.say) bad(where + ' step ' + i + ' has no say'); });
      if (sc.type === 'term' && g) (typeof sc.lines === 'function' ? sc.lines() : sc.lines).forEach((l, i) => { if (l.node && !g._ids.has(l.node)) bad(where + ' line ' + i + ': unknown node ' + l.node); if (l.on) l.on.forEach(e => { if (!g._edges.has(e)) bad(where + ' line ' + i + ': unknown edge ' + e); }); });
    }
    if ((sc.type === 'code' || sc.type === 'sql') && sc.steps) {
      const n = sc.code.split('\n').length;
      sc.steps.forEach((st, i) => {
        if (!st.say) bad(where + ' step ' + i + ' has no say');
        if (st.lines) {
          if (st.lines[0] < 1 || st.lines[1] > n || st.lines[0] > st.lines[1]) bad(where + ' step ' + i + ' lines out of range ' + st.lines + ' of ' + n);
          else if (verbose) console.log(where, 'step', i, st.lines, '=>', JSON.stringify(sc.code.split('\n')[st.lines[0] - 1]), '...', JSON.stringify(sc.code.split('\n')[st.lines[1] - 1]));
        }
        if (st.clines && sc.compiled) { const m = sc.compiled.code.split('\n').length; if (st.clines[1] > m) bad(where + ' clines out of range'); }
      });
      if (sc.type === 'sql' && sc.result && !sc.steps.some(s => s.run)) bad(where + ' sql result but no run step');
    }
    if (sc.type === 'bug') {
      const n = sc.code.split('\n').length;
      [].concat(sc.bad).forEach(b => { if (b < 1 || b > n) bad(where + ' bug line out of range'); else if (verbose) console.log(where, 'bug line', b, JSON.stringify(sc.code.split('\n')[b - 1])); });
      if (!sc.why) bad(where + ' bug needs why');
    }
    if (sc.type === 'quiz') { if (sc.ok == null || sc.ok >= sc.opts.length) bad(where + ' quiz ok index'); if (!sc.why) bad(where + ' quiz needs why'); if (sc.opts.length < 3) bad(where + ' quiz needs 3+ options'); }
    if (sc.type === 'decide') { if (sc.pick == null || sc.pick >= sc.opts.length) bad(where + ' decide pick'); sc.opts.forEach((o, k) => { if (k !== sc.pick && !o.lose) bad(where + ' decide option ' + k + ' needs "lose"'); }); }
    if (sc.type === 'incident') { if (sc.best == null || sc.best >= sc.opts.length) bad(where + ' incident best'); if (!sc.checks || !sc.prevent || !sc.tell) bad(where + ' incident needs checks, tell and prevent'); }
    if (sc.type === 'qa') {
      if (!sc.pts || !sc.pts.length) bad(where + ' qa needs pts'); if (!sc.short) bad(where + ' qa needs short');
      const wc = s => s.trim().split(/\s+/).length;
      const w = wc(sc.short); if (w > 190) bad(where + ' short answer too long for 60s: ' + w + ' words'); if (verbose) console.log(where, 'short words', w, 'long words', sc.long ? wc(sc.long) : '-');
      if (sc.long && wc(sc.long) > 380) bad(where + ' long answer too long for 2 min: ' + wc(sc.long));
    }
    if (sc.type === 'order') { if (!sc.items || sc.items.length < 3) bad(where + ' order items'); }
    if (sc.type === 'mock') { if (!LAB.chapters.some(c => c.scenes.some(s => s.id === sc.qid && s.type === 'qa'))) bad(where + ' mock question ' + sc.qid + ' does not exist'); }
    if (sc.type === 'widget') widgetKinds.add(sc.kind);
    if (sc.type === 'challenge') { if (!sc.sol) bad(where + ' challenge needs sol'); if (!sc.hints || !sc.hints.length) bad(where + ' challenge needs hints'); }
  });
});

// every path must contain lesson content for every numbered mission
const lvls = (LAB.config.tracks || []).map(t => t.level);
LAB.chapters.forEach(ch => {
  if (!ch.n) return;
  lvls.forEach(l => { if (!ch.scenes.some(s => s.t <= l && s.type !== 'intro' && s.type !== 'recap')) bad(ch.id + ' has no lesson content at level ' + l); });
});
console.log('chapters:', LAB.chapters.length, 'scenes:', ids.size, JSON.stringify(perType));
console.log('scenes by tier (1 = everyone, 2 = senior, 3 = extra):', JSON.stringify(perTier), ' widgets:', [...widgetKinds].join(', ') || '-');
console.log(problems ? problems + ' problem(s)' : 'lint clean');
process.exit(problems ? 1 : 0);
