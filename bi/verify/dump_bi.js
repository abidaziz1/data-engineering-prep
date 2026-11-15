// Dumps what verify_bi.py needs from the BI course: the code of every code, sql, bug and challenge scene with its language, the fixes of the bug hunts,
// the result tables that the sql scenes show, and every text string of the lessons.
// Run: node bi/verify/dump_bi.js > out.json
const fs = require('fs'), path = require('path');
global.window = global; global.LAB = {};
const root = path.join(__dirname, '..', '..');
const shared = path.join(root, 'shared', 'js') + '/';
const tut = path.join(root, 'bi', 'js') + '/';
const load = f => { (0, eval)(fs.readFileSync(f, 'utf8')); };
load(tut + 'config.js'); load(tut + 'real.js'); load(shared + 'util.js'); load(tut + 'helpers.js');
load(shared + 'graph.js'); load(shared + 'term.js'); load(tut + 'graphs.js'); load(shared + 'render1.js'); load(shared + 'render2.js');
fs.readdirSync(tut).filter(f => /^widgets\d*\.js$/.test(f)).sort().forEach(f => load(tut + f));
load(shared + 'build.js');
fs.readdirSync(tut + 'content').filter(f => f.endsWith('.js')).sort().forEach(f => load(tut + 'content/' + f));

const out = { code: [], strings: [], scenes: [] };
LAB.chapters.forEach(ch => ch.scenes.forEach(sc => {
  out.scenes.push({ id: sc.id, type: sc.type, t: sc.t, src: sc.src || null });
  if (sc.code) out.code.push({ id: sc.id, type: sc.type, lang: sc.lang || 'text', file: sc.file || null, code: sc.code, result: sc.result || null, src: sc.src || null });
  if (sc.fix) out.code.push({ id: sc.id + ':fix', type: 'fix', lang: sc.lang || 'text', file: sc.file || null, code: sc.fix, result: null, src: null });
  if (sc.sol) out.code.push({ id: sc.id + ':sol', type: 'sol', lang: sc.lang || 'text', file: sc.file || null, code: sc.sol, result: sc.res || null, src: null });
}));
(function walk(o, p) {
  if (typeof o === 'string') out.strings.push([p, o]);
  else if (Array.isArray(o)) o.forEach((x, i) => walk(x, p + '[' + i + ']'));
  else if (o && typeof o === 'object') Object.keys(o).forEach(k => { if (k !== 'lines') walk(o[k], p + '.' + k); });
})(LAB.chapters, 'ch');
process.stdout.write(JSON.stringify(out));
