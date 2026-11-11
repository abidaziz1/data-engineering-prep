// Checks the logic of the AI lab widgets against the recording and against arithmetic done in code that does not share anything with the widgets:
// the retrieval scores (hit at k, MRR, nDCG), the vector measures, and the invariants that the recorded tables must keep (recall rises with the
// settings, work rises with the settings, counts add up). The widgets themselves are exercised in the browser by dev/e2e.js.
// Run: node ai/verify/check_widgets.js
const fs = require('fs'), path = require('path');
global.window = global; global.LAB = {};
const root = path.join(__dirname, '..', '..');
const shared = path.join(root, 'shared', 'js') + '/', tut = path.join(root, 'ai', 'js') + '/';
const load = f => { (0, eval)(fs.readFileSync(f, 'utf8')); };
['config.js', 'real.js'].forEach(f => load(tut + f));
load(shared + 'util.js'); load(tut + 'helpers.js'); load(shared + 'graph.js'); load(shared + 'term.js'); load(tut + 'graphs.js');
load(shared + 'render1.js'); load(shared + 'render2.js'); load(tut + 'widgets.js'); load(tut + 'widgets2.js');

const W = LAB.W, G = LAB.get;
let checks = 0, fails = 0;
const eq = (got, want, what) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) { fails++; console.log('FAIL:', what, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };
const near = (got, want, what, tol) => { checks++; if (Math.abs(got - want) > (tol || 1e-9)) { fails++; console.log('FAIL:', what, 'got', got, 'want', want); } };

// ---- Retrieval metrics: written again here, in another way, and compared on every list of ten places --------------------------------------------------
function ref(list, total) {
  let first = 0, dcg = 0;
  for (let i = 0; i < 10; i++) if (list[i]) { if (!first) first = i + 1; dcg += 1 / (Math.log(i + 2) / Math.log(2)); }
  let ideal = 0; for (let i = 0; i < Math.min(total, 10); i++) ideal += 1 / (Math.log(i + 2) / Math.log(2));
  const at = k => list.slice(0, k).some(x => x) ? 1 : 0;
  return { hit1: at(1), hit3: at(3), hit5: at(5), mrr: first ? 1 / first : 0, ndcg: ideal ? dcg / ideal : 0 };
}
let lists = 0;
for (let n = 0; n < 1024; n++) {
  const l = []; for (let i = 0; i < 10; i++) l.push((n >> i) & 1);
  const total = Math.max(1, l.reduce((a, b) => a + b, 0)), got = W.rankInfo.metrics(l, total), want = ref(l, total);
  lists++;
  ['hit1', 'hit3', 'hit5'].forEach(k => { if (got[k] !== want[k]) { fails++; console.log('FAIL: metric', k, 'for', l.join('')); } });
  if (Math.abs(got.mrr - want.mrr) > 1e-12 || Math.abs(got.ndcg - want.ndcg) > 1e-12) { fails++; console.log('FAIL: mrr or ndcg for', l.join('')); }
  checks += 4;
}
eq(lists, 1024, 'every list of ten places was checked');
near(W.rankInfo.metrics([0, 1, 0, 0, 1, 0, 0, 0, 0, 0], 2).ndcg, (1 / Math.log2(3) + 1 / Math.log2(6)) / (1 + 1 / Math.log2(3)), 'nDCG of the default list of the lab, by hand', 1e-12);

// ---- The recorded scoreboard follows from the recorded ranks --------------------------------------------------------------------------------------------
const Q = G.table('search.questions'), ME = G.table('search.methods'), BK = G.counts('search.by_kind');
eq(Q.rows.length, 24, 'twenty-four questions');
['BM25 (keywords)', 'vector (stand-in)', 'hybrid (RRF)'].forEach((name, m) => {
  const row = ME.rows.find(r => r[0] === name);
  [['hit@1', 1, 1], ['hit@3', 2, 3], ['hit@5', 3, 5]].forEach(([lab, ci, k]) => {
    const n = Q.rows.filter(r => r[3 + m] !== '-' && r[3 + m] <= k).length / 24;
    near(W.rankInfo.score(3 + m, lab, 'all').value, n, 'the lab computes ' + lab + ' of ' + name + ' from the ranks', 1e-12);
    near(Math.round(n * 1000) / 1000, row[ci], name + ' ' + lab + ' in the recorded scoreboard equals the share computed from the ranks', 1e-12);
  });
  const mrr = Q.rows.reduce((a, r) => a + (r[3 + m] !== '-' && r[3 + m] <= 10 ? 1 / r[3 + m] : 0), 0) / 24;
  near(Math.round(mrr * 1000) / 1000, row[4], name + ' MRR@10 in the recorded scoreboard equals the value computed from the ranks', 1e-12);
  Object.keys(BK.questions_by_kind).forEach(kind => {
    const qs = Q.rows.filter(r => r[1] === kind), h = qs.filter(r => r[3 + m] !== '-' && r[3 + m] <= 3).length / qs.length;
    near(Math.round(h * 1000) / 1000, BK['hit@3_by_kind'][kind][name], name + ' hit@3 for the kind ' + kind + ' follows from the ranks', 1e-12);
  });
});

// ---- Vector measures: identities that must hold for any two vectors ---------------------------------------------------------------------------------------
const V = W.vectorsInfo;
[[[3, 4], [6, 8]], [[3, 4], [-4, 3]], [[1, 0], [0, 1]], [[2, -1], [-3, 5]]].forEach(([a, b]) => {
  const la = Math.hypot(...a), lb = Math.hypot(...b);
  near(V.cos(a, b), V.dot(a, b) / (la * lb), 'cosine is the dot product over the lengths for ' + JSON.stringify([a, b]));
  near(V.l2(a, b) ** 2, la ** 2 + lb ** 2 - 2 * V.dot(a, b), 'the squared distance is |a|2 + |b|2 - 2 dot for ' + JSON.stringify([a, b]), 1e-9);
  const ua = a.map(x => x / la), ub = b.map(x => x / lb);
  near(V.l2(ua, ub) ** 2, 2 - 2 * V.cos(a, b), 'for unit vectors the squared distance is 2 - 2 cosine for ' + JSON.stringify([a, b]), 1e-9);
});

// ---- Recorded tables keep their invariants ------------------------------------------------------------------------------------------------------------------
const HN = G.table('ann.hnsw').rows, IV = G.table('ann.ivf').rows, SW = G.table('chunk.sweep').rows, PR = G.table('pipeline.runs').rows, FT = G.counts('finetune.dataset');
[8, 16, 32].forEach(m => {
  const rows = HN.filter(r => r[0] === m).sort((a, b) => a[1] - b[1]);
  eq(rows.length, 6, 'six efSearch values for M ' + m);
  rows.slice(1).forEach((r, i) => { eq(r[2] >= rows[i][2] && r[3] > rows[i][3], true, 'HNSW M ' + m + ': a larger efSearch gives at least the recall and more work'); });
});
IV.slice(1).forEach((r, i) => eq(r[1] >= IV[i][1] && r[2] > IV[i][2], true, 'IVF: a larger nprobe gives at least the recall and more work'));
SW.slice(1).forEach((r, i) => eq(r[1] <= SW[i][1] && r[6] > SW[i][6], true, 'chunk sweep: a larger size gives fewer chunks and more text for the top five'));
eq(PR.map(r => r[5]), [87, 0, 1, 0, 0, 0], 'embeddings computed in the six runs');
PR.forEach((r, i) => { if (i > 0) eq(r[2] + r[3] - r[4] >= 0, true, 'run ' + (i + 1) + ': chunks added and unchanged are not negative'); });
eq(FT.generated + FT.repeats_added + FT.spacing_variants_added, FT.after_adding_repeats, 'the generated examples plus the repeats and the spacing variants are the dirty set');
eq(FT.after_exact_dedup <= FT.after_adding_repeats && FT.after_near_dedup <= FT.after_exact_dedup, true, 'cleaning only removes rows');
const SPL = G.table('finetune.split').rows;
eq(SPL[0][1] + SPL[0][2], SPL[1][1] + SPL[1][2], 'both splits cover the same number of examples');
const GD = G.counts('eval.gate_detail');
Object.keys(GD.candidates).forEach(k => { const c = GD.candidates[k]; eq(c.verdict === 'pass', c.reasons.length === 0, 'gate ' + k + ': a pass has no reasons'); eq(c.worse.every(id => /^q\d\d$/.test(id)), true, 'gate ' + k + ': worse questions are question ids'); });
const W2 = G.counts('eval.noise').methods;
Object.keys(W2).forEach(k => eq(W2[k].low <= W2[k].share && W2[k].share <= W2[k].high && W2[k].n === 24, true, 'the interval of ' + k + ' contains its share'));

console.log(checks + ' checks, ' + (fails ? fails + ' failed' : 'all passed'));
process.exit(fails ? 1 : 0);
