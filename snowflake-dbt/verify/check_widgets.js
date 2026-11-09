// Checks the logic of the lab widgets against the recorded statements and against arithmetic done by hand.
// Run: node snowflake-dbt/verify/check_widgets.js
const fs = require('fs'), path = require('path');
global.window = global; global.LAB = {};
const root = path.join(__dirname, '..', '..');
const shared = path.join(root, 'shared', 'js') + '/', tut = path.join(root, 'snowflake-dbt', 'js') + '/';
const load = f => { (0, eval)(fs.readFileSync(f, 'utf8')); };
['config.js', 'real.js'].forEach(f => load(tut + f));
load(shared + 'util.js'); load(tut + 'helpers.js'); load(shared + 'graph.js'); load(shared + 'term.js'); load(tut + 'graphs.js');
load(shared + 'render1.js'); load(shared + 'render2.js'); load(tut + 'widgets.js');

const W = LAB.W, G = LAB.get;
let checks = 0, fails = 0;
const eq = (got, want, what) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) { fails++; console.log('FAIL:', what, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };
const near = (got, want, what) => { checks++; if (Math.abs(got - want) > 1e-9) { fails++; console.log('FAIL:', what, 'got', got, 'want', want); } };

// ---- credit calculator: every number below was worked out by hand -----------------------------------
const C = W.costCalc;
eq(Object.keys(C.rate).map(k => C.rate[k]), [1, 2, 4, 8, 16, 32, 64, 128], 'each size doubles the credits an hour');
near(C.perRunCredits('S', 120), 2 * 120 / 3600, 'Small, 120 s');
near(C.perRunCredits('XS', 20), C.perRunCredits('XS', 60), 'a 20 second run is billed as 60 seconds');
near(C.perRunCredits('L', 600), 8 * 600 / 3600, 'Large, 600 s');
eq(C.billedSeconds(86400, 30, 60), 90, 'one run a day: 30 s run + 60 s idle');
eq(C.billedSeconds(86400, 10, 0), 60, 'a run that ends at once is billed as 60 seconds');
eq(C.billedSeconds(300, 30, 60), 288 * 90, 'every 5 minutes with a 60 s suspend: 288 separate segments of 90 s');
eq(C.billedSeconds(300, 30, 600), 86100 + 30 + 600, 'every 5 minutes with a 600 s suspend: one segment, on all day');
eq(C.billedSeconds(3600, 30, 600), 24 * 630, 'every hour with a 600 s suspend: 24 segments of 630 s');
eq(C.billedSeconds(3600, 30, 3600), 82800 + 30 + 3600, 'every hour with a 3600 s suspend: one segment');
for (const [g, r] of [[300, 30], [900, 120], [3600, 30]]) {
  const b = [60, 300, 600, 3600].map(s => C.billedSeconds(g, r, s));
  eq(b.every((x, i) => i === 0 || x >= b[i - 1]), true, 'a longer auto-suspend never bills less (gap ' + g + ', run ' + r + ')');
}
const s1 = [0, 1, 2, 3, 4].map(n => C.scale(1, n, 32));
eq(s1.map(x => +x.min.toFixed(1)), [32, 16, 8, 4, 2], 'a query that doubles in speed halves its time');
s1.forEach((x, n) => near(x.credits, 32 / 60, 'doubling in speed keeps the credits flat at size ' + n));
const s5 = [0, 1, 2, 3, 4].map(n => C.scale(0.5, n, 32).credits);
eq(s5.map(x => +x.toFixed(2)), [0.53, 0.71, 0.95, 1.26, 1.69], 'a 50 percent gain per size raises the credits by a third each step');

// ---- strategies lab: read from the recorded statements --------------------------------------------
const S = W.stratInfo;
const expect = {
  incr_merge: [true, ['merge'], 'view'], incr_delete_insert: [true, ['delete', 'insert'], 'table'], incr_append: [true, ['insert'], 'view'],
  incr_microbatch: [false, ['delete', 'insert'], 'view'], incr_merge_columns: [true, ['merge'], 'view'], incr_predicates: [true, ['merge'], 'view']
};
Object.keys(expect).forEach(k => {
  eq(S.oneTxn(k), expect[k][0], k + ': one transaction');
  eq(S.verbs(k), expect[k][1], k + ': statements on the table');
  eq(S.tmpKind(k), expect[k][2], k + ': temporary object');
});
eq(S.oneBatch('incr_microbatch').length, 4, 'the first microbatch is four statements');

// ---- settings lab: what changed against the baseline -----------------------------------------------
const want = {
  baseline: ['base'], transient_false: ['changed'], copy_grants: ['changed'], cluster_by: ['changed', 'added'],
  warehouse: ['added', 'added', 'same', 'added'], query_tag: ['added', 'same', 'added'], secure_view: ['changed'],
  grants: ['same', 'added', 'added'], dynamic_table: ['added', 'added', 'added', 'added'], post_hook: ['same', 'added']
};
W.cfgSet.forEach(x => eq(W.cfgDiff(x.k).map(d => d.st), want[x.k], 'settings lab, ' + x.k + ': changed or added statements'));
eq(W.cfgSet.length, 10, 'ten settings');

// ---- environment lab ----------------------------------------------------------------------------------
const E = W.envInfo;
eq(E.made('run_two_prod', 'dim_customers').name, 'BREWLINE.marts.dim_customers', 'prod: full name of the mart');
eq(E.made('run_two_prod', 'dim_customers').kind, 'transient table', 'prod: the mart is a transient table');
eq(E.made('run_two_ci', 'dim_customers').name, 'BREWLINE_CI.PR_123.dim_customers', 'ci: full name of the mart');
eq(E.made('run_all_dev', 'stg_brewline__customers').kind, 'view', 'dev: staging is a view');
eq(['run_all_dev', 'run_two_ci', 'run_two_prod'].map(k => { const c = E.conn(k); return [c.role, c.warehouse, c.database]; }),
  [['TRANSFORMER', 'WH_TRANSFORM_DEV', 'BREWLINE_DEV'], ['CI_DEPLOYER', 'WH_CI', 'BREWLINE_CI'], ['TRANSFORMER', 'WH_TRANSFORM', 'BREWLINE']], 'role, warehouse and database per target');

// ---- helpers used by the lessons ---------------------------------------------------------------------
eq(G.relOf('create or replace transient table A.B.Fct_Orders\n  as ('), 'fct_orders', 'relOf reads a create statement');
eq(G.relOf('merge into "A"."B"."SNAP__dbt_tmp" as x'), 'snap', 'relOf drops the temporary suffix');
eq(G.head('select\n   a,\n b', 20), 'select', 'head keeps the first line');

console.log(checks + ' checks, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
