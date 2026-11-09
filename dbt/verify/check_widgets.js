// Checks the logic of the dbt lab widgets against what dbt really did (js/real.js), without a browser.
// Run: node dbt/verify/check_widgets.js
const fs = require('fs'), path = require('path');
global.window = global; global.LAB = {}; global.document = {};
const root = path.join(__dirname, '..', '..');
const sh = path.join(root, 'shared', 'js') + '/', tut = path.join(root, 'dbt', 'js') + '/';
const load = f => { (0, eval)(fs.readFileSync(f, 'utf8')); };
['config.js', 'real.js'].forEach(f => load(tut + f));
load(sh + 'util.js'); load(tut + 'helpers.js'); load(sh + 'graph.js'); load(sh + 'term.js'); load(tut + 'graphs.js'); load(sh + 'render1.js'); load(sh + 'render2.js'); load(tut + 'widgets.js');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const G = LAB.get, W = LAB.W;

// 1. The snapshot lab applies the same rule as dbt's timestamp strategy: replay the two real runs.
(function () {
  const raw = G.table('raw_customers');
  const src = raw.rows.map(r => ({ id: r[0], country: r[3], tier: r[4], at: '2026-03-14 06:00:00' }));
  const snap = [];
  W.snapRule(src, snap);
  const fmt = rows => rows.map(r => [r.id, r.tier, r.country, r.from, r.to].join('|')).sort().join('\n');
  const real1 = G.table('snap_day1').rows.map(r => r.join('|')).sort().join('\n');
  ok(fmt(snap) === real1, 'snapshot lab, run 1, equals the real snapshot after the first dbt run');
  src.forEach(r => { snap.forEach(x => { delete x.fresh; delete x.closed; }); });
  src.find(r => r.id === 'C-42').tier = 'gold'; src.find(r => r.id === 'C-42').at = '2026-03-18 06:00:00';
  src.find(r => r.id === 'C-77').country = 'de'; src.find(r => r.id === 'C-77').at = '2026-03-18 06:00:00';
  const wrote = W.snapRule(src, snap);
  const real2 = G.table('snap_day2').rows.map(r => r.join('|')).sort().join('\n');
  ok(fmt(snap) === real2, 'snapshot lab, run 2, equals the real snapshot after the second dbt run');
  ok(wrote === 4, 'run 2 writes four rows (two closed, two opened)');
  const again = W.snapRule(src, snap);
  ok(again === 0, 'a third run with no change writes nothing');
})();

// 2. Schema names: the rule equals what dbt printed, for the staging layer.
(function () {
  ['dev', 'prod'].forEach(t => ['default', 'custom'].forEach(m => {
    const line = G.grep(G.log('schema_' + m + '_' + t), /OK created sql view model/);
    const rel = (line.match(/model (\S+)\.stg_brewline__customers/) || [])[1];
    ok(rel === W.schemaOf('staging', t, m === 'default' ? 'default' : 'override'), 'schema rule for ' + m + ' ' + t + ' equals the real relation (' + rel + ')');
  }));
})();

// 3. Thread lab: monotone, bounded by the longest chain, and the text claims hold.
(function () {
  const t = [1, 2, 4, 8].map(n => W.schedule(n).total);
  console.log('thread totals (1, 2, 4, 8 threads):', t.join(', '));
  ok(t[0] >= t[1] && t[1] >= t[2] && t[2] >= t[3], 'more threads never make it slower');
  const c = W.chain();
  console.log('longest chain:', c.path.join(' > '), c.len, 's');
  ok(t[3] === c.len, 'with enough threads the total equals the longest chain, ' + c.len + ' s (got ' + t[3] + ')');
  ok(t[2] === c.len, 'four threads already reach the longest chain (got ' + t[2] + ')');
  ok(t[1] > c.len && t[1] < t[0], 'two threads help but do not reach it (got ' + t[1] + ')');
  ok(t[0] === 325, 'one thread takes the sum of all durations, 325 s (got ' + t[0] + ')');
})();

// 4. Which check catches it: every piece of evidence exists in the real logs.
(function () {
  const defs = W.testlab.DEF;
  defs.forEach(d => {
    const hit = G.grep(G.log(d.log), d.re);
    ok(hit.length > 0, 'test lab evidence for "' + d.id + '" is in the ' + d.log + ' log');
  });
  const answers = new Set(defs.map(d => d.a));
  ok(answers.size === defs.length, 'each problem has its own answer');
})();

// 5. Selector lab: every selector the lab offers returns nodes that the diagram can show.
(function () {
  const byReal = {}; LAB.graphs.dag.nodes.forEach(n => { byReal[n.real] = n.id; });
  Object.keys(LAB.real.ls).forEach(k => {
    const names = LAB.real.ls[k];
    const unknown = names.filter(n => !byReal[n]);
    if (k === 'hardcoded_up' || k === 'raw_direct_down' || k === 'all') return;
    ok(unknown.length === 0, 'selector "' + k + '" returns only nodes in the diagram' + (unknown.length ? ' (unknown: ' + unknown.join(', ') + ')' : ''));
  });
})();

// 6. Incremental lab: the verdicts that the text states.
(function () {
  const rows = k => G.table(k).rows;
  const dup = k => { const ids = rows(k).map(r => r[0]); return ids.length !== new Set(ids).size; };
  const o5010 = k => rows(k).filter(r => r[0] === 'O-5010').map(r => r[1]);
  ok(dup('strategy_append_rows'), 'append leaves a duplicate order');
  ['strategy_delete_insert_rows', 'strategy_merge_rows', 'strategy_microbatch_rows'].forEach(k => {
    ok(!dup(k) && o5010(k).join() === 'SHIPPED', k + ' has one row per order and O-5010 is SHIPPED');
  });
  ok(!dup('inc_bug_all') && o5010('inc_bug_all').join() === 'PLACED', 'the ordered_at filter leaves O-5010 stale');
  ok(G.log('strategy_append_test').indexOf('FAIL 1 unique_fct_orders_order_id') >= 0, 'the append run fails the unique test');
})();

// 7. The diagram nodes and the first-build log use the same names, so the terminal can light them.
(function () {
  const map = G.nodeMap('dag');
  const lines = G.term('build_day1');
  const lit = new Set(lines.filter(l => l.node).map(l => l.node));
  LAB.graphs.dag.nodes.filter(n => !/^source:/.test(n.real)).forEach(n => ok(lit.has(n.id), 'the first build lights the node ' + n.id));
})();

console.log(pass + ' checks passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
