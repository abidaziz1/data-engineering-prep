// Dump every code snippet and every shown result table of a tutorial as JSON, so other tools can check them.
// Run: node dev/dump-scenes.js snowflake > out.json
const fs = require('fs'), path = require('path');
const name = process.argv[2] || 'snowflake';
global.window = global; global.LAB = {};
const shared = path.join(__dirname, '..', 'shared', 'js') + '/';
const tut = path.join(__dirname, '..', name, 'js') + '/';
const load = f => { (0, eval)(fs.readFileSync(f, 'utf8')); };
const has = f => fs.existsSync(f);
load(tut + 'config.js');
if (has(tut + 'real.js')) load(tut + 'real.js');
load(shared + 'util.js');
if (has(tut + 'helpers.js')) load(tut + 'helpers.js');
load(shared + 'graph.js'); load(shared + 'term.js'); load(tut + 'graphs.js'); load(shared + 'build.js');
fs.readdirSync(tut + 'content').filter(f => f.endsWith('.js')).sort().forEach(f => load(tut + 'content/' + f));
const out = { snippets: [], results: [] };
const add = (id, kind, lang, code) => { if (typeof code === 'string' && code.trim()) out.snippets.push({ id, kind, lang, code }); };
LAB.chapters.forEach(ch => ch.scenes.forEach(sc => {
  const lang = sc.lang || (sc.type === 'sql' ? 'sql' : '');
  if (sc.code) add(sc.id, 'code', lang, sc.code);
  if (sc.fix) add(sc.id, 'fix', lang, sc.fix);
  if (sc.sol) add(sc.id, 'sol', lang, sc.sol);
  if (sc.starter) add(sc.id, 'starter', lang, sc.starter);
  if (sc.compiled && sc.compiled.code) add(sc.id, 'compiled', sc.compiled.lang || 'sql', sc.compiled.code);
  if (sc.steps) sc.steps.forEach((st, i) => { if (st.code && st.code.code) add(sc.id + ' step ' + i, 'step', st.code.lang, st.code.code); });
  if (sc.result) out.results.push({ id: sc.id, kind: 'result', cols: sc.result.cols, rows: sc.result.rows });
  if (sc.res) out.results.push({ id: sc.id, kind: 'res', cols: sc.res.cols, rows: sc.res.rows });
}));
process.stdout.write(JSON.stringify(out));
