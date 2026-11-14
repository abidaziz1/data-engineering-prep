// Dumps what verify_fl.py needs from the Flink course and dev/dump-scenes.js does not give: every text string of the lessons (to find inline commands and configuration keys),
// the lines of the terminal replays, the quiz and bug-hunt texts and the code of each scene with its language.
// Run: node flink/verify/dump_fl.js > out.json
const fs = require('fs'), path = require('path');
global.window = global; global.LAB = {};
const root = path.join(__dirname, '..', '..');
const shared = path.join(root, 'shared', 'js') + '/';
const tut = path.join(root, 'flink', 'js') + '/';
const load = f => { (0, eval)(fs.readFileSync(f, 'utf8')); };
load(tut + 'config.js'); load(tut + 'real.js'); load(shared + 'util.js'); load(tut + 'helpers.js');
load(shared + 'graph.js'); load(shared + 'term.js'); load(tut + 'graphs.js'); load(shared + 'render1.js'); load(shared + 'render2.js');
fs.readdirSync(tut).filter(f => /^widgets\d*\.js$/.test(f)).sort().forEach(f => load(tut + f));
load(shared + 'build.js');
fs.readdirSync(tut + 'content').filter(f => f.endsWith('.js')).sort().forEach(f => load(tut + 'content/' + f));

const out = { strings: [], terms: [], scenes: [], widgets: [], chapters: [] };
(function walk(o, p) {
  if (typeof o === 'string') out.strings.push([p, o]);
  else if (Array.isArray(o)) o.forEach((x, i) => walk(x, p + '[' + i + ']'));
  else if (o && typeof o === 'object') Object.keys(o).forEach(k => walk(o[k], p + '.' + k));
})(LAB.chapters.map(c => c.scenes.map(s => Object.assign({}, s, { lines: undefined }))), 'ch');
LAB.chapters.forEach(ch => {
  out.chapters.push({ id: ch.id, n: ch.n, title: ch.title, scenes: ch.scenes.length });
  ch.scenes.forEach(sc => {
    out.scenes.push({ id: sc.id, ch: ch.id, type: sc.type, t: sc.t, src: sc.src, kind: sc.kind, lang: sc.lang || null });
    if (sc.type === 'widget') out.widgets.push({ id: sc.id, kind: sc.kind });
    if (sc.type === 'term') {
      const lines = typeof sc.lines === 'function' ? sc.lines() : sc.lines;
      lines.forEach(l => out.terms.push({ id: sc.id, c: l.c, t: l.t }));
    }
  });
});
process.stdout.write(JSON.stringify(out));
