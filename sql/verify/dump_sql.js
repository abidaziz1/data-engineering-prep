// Dump every snippet, result table and challenge of the SQL tutorial as JSON, for verify_sq.py.
// Run: node sql/verify/dump_sql.js > out.json
const fs = require('fs'), path = require('path');
global.window = global; global.LAB = {};
const root = path.join(__dirname, '..', '..');
const shared = path.join(root, 'shared', 'js') + '/', tut = path.join(root, 'sql', 'js') + '/';
const load = f => { (0, eval)(fs.readFileSync(f, 'utf8')); };
load(tut + 'config.js'); load(tut + 'real.js'); load(shared + 'util.js'); load(tut + 'helpers.js');
load(shared + 'graph.js'); load(shared + 'term.js'); load(tut + 'graphs.js'); load(shared + 'render1.js'); load(shared + 'render2.js');
fs.readdirSync(tut).filter(f => /^widgets\d*\.js$/.test(f)).sort().forEach(f => load(tut + f));
load(shared + 'build.js');
fs.readdirSync(tut + 'content').filter(f => f.endsWith('.js')).sort().forEach(f => load(tut + 'content/' + f));
const scenes = [];
LAB.chapters.forEach(ch => ch.scenes.forEach(sc => {
  const o = { id: sc.id, ch: ch.id, type: sc.type, t: sc.t, src: sc.src || null, lang: sc.lang || null, kind: sc.kind || null, engine: sc.engine || null };
  if (sc.ctx) o.ctx = sc.ctx;
  ['code', 'fix', 'sol', 'starter'].forEach(k => { if (typeof sc[k] === 'string') o[k] = sc[k]; });
  if (sc.result) o.result = { cols: sc.result.cols, rows: sc.result.rows };
  if (sc.res) o.res = { cols: sc.res.cols, rows: sc.res.rows };
  if (sc.data) o.data = sc.data.map(d => ({ name: d.name, cols: d.cols, rows: d.rows, types: d.types, pk: d.pk || null }));
  if (sc.type === 'qa') o.words = String(sc.short || '').split(/\s+/).length;
  scenes.push(o);
}));
process.stdout.write(JSON.stringify({ scenes: scenes, chapters: LAB.chapters.map(c => ({ id: c.id, n: c.n, title: c.title, scenes: c.scenes.length })), labs: Object.keys(LAB.W), graphs: Object.keys(LAB.graphs) }));
