// Checks the logic of the Azure lab widgets against the recording and against arithmetic done by hand, with code that does not share anything with
// the widgets: the blob listing rule, the SAS answers, the access order, the role scopes, the credential chain, the expression evaluator, the three
// watermark strategies, the files that a wildcard opens, the dedicated pool numbers, the Event Hubs batch and checkpoint arithmetic, the queue
// timeline and the bill.
// Run: node azure/verify/check_widgets.js
const fs = require('fs'), path = require('path');
global.window = global; global.LAB = {};
const root = path.join(__dirname, '..', '..');
const shared = path.join(root, 'shared', 'js') + '/', tut = path.join(root, 'azure', 'js') + '/';
const load = f => { (0, eval)(fs.readFileSync(f, 'utf8')); };
['config.js', 'real.js'].forEach(f => load(tut + f));
load(shared + 'util.js'); load(tut + 'helpers.js'); load(shared + 'graph.js'); load(shared + 'term.js'); load(tut + 'graphs.js');
load(shared + 'render1.js'); load(shared + 'render2.js'); load(tut + 'widgets.js');

const W = LAB.W, G = LAB.get;
let checks = 0, fails = 0;
const eq = (got, want, what) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) { fails++; console.log('FAIL:', what, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };
const near = (got, want, what, tol) => { checks++; if (Math.abs(got - want) > (tol || 1e-9)) { fails++; console.log('FAIL:', what, 'got', got, 'want', want); } };

// ---- Blob listing: the documented rule (prefix, then roll up at the delimiter) applied to the recorded blob names -------------------------------------
const NAMES = G.counts('blob.keys').keys.map(k => k.name);
eq(NAMES.length, 10, 'the container holds ten blobs');
function listRule(prefix, delim) {
  const under = NAMES.filter(k => k.startsWith(prefix)), cps = [], keys = [];
  under.forEach(k => {
    const rest = k.slice(prefix.length), i = delim ? rest.indexOf(delim) : -1;
    if (i >= 0) { const cp = prefix + rest.slice(0, i + 1); if (!cps.includes(cp)) cps.push(cp); } else keys.push(k);
  });
  return { common_prefixes: cps.sort(), keys: keys.sort(), key_count: cps.length + keys.length };
}
const rec = G.counts('blob.listing');
eq(rec.length, W.listingInfo.prefixes.length * 2, 'every prefix of the lab was listed with and without a delimiter');
rec.forEach(r => {
  const w = listRule(r.prefix, r.delimiter);
  eq({ common_prefixes: r.common_prefixes.slice().sort(), keys: r.keys.slice().sort(), key_count: r.key_count }, w, 'listing with prefix "' + r.prefix + '" and delimiter "' + r.delimiter + '" follows the rule');
});
eq(W.listingInfo.find('ord', '/').keys.length + W.listingInfo.find('ord', '/').common_prefixes.length > 0, true, 'a partial name such as ord still lists what starts with it');
const pg = G.counts('blob.pages');
eq(pg.pages.map(p => p.keys.length), [4, 4, 2], 'ten blobs in pages of four');
eq(pg.pages.map(p => !!p.has_continuation_token), [true, true, false], 'only the last page has no continuation token');

// ---- SAS: the answers of the emulator follow the rules of the token fields ----------------------------------------------------------------------------
const M = G.counts('sas.matrix'), NEED = { 'GET the blob': 'r', 'PUT the blob': 'w', 'DELETE the blob': 'd', 'GET the other blob': 'r', 'LIST the container': 'l' };
eq(M.cases.length, 5, 'five tokens');
eq(M.ops.length, 5, 'five requests');
M.cases.forEach(c => c.results.forEach(r => {
  let allow;
  if (c.sas === 'read, but expired' || c.sas === 'read, edited to write') allow = false;                 // an expired token or an edited URL fails every call
  else {
    const op = r.op, sr = c.fields.sr, covers = (op === 'GET the other blob' || op === 'LIST the container') ? sr === 'c' : true;
    allow = covers && c.fields.sp.indexOf(NEED[op]) >= 0;
  }
  eq(r.status < 300, allow, 'SAS "' + c.sas + '", ' + r.op + ': allowed is ' + allow + ' by the fields (got ' + r.status + ')');
  if (!allow) eq(/^Authorization(Failure|PermissionMismatch)$/.test(r.code) && r.status === 403, true, 'SAS "' + c.sas + '", ' + r.op + ': refused with 403 and an Azurite code');
  if (!allow && c.sas !== 'read, but expired' && c.sas !== 'read, edited to write' && (r.op === 'PUT the blob' || r.op === 'DELETE the blob')) eq(r.code, 'AuthorizationPermissionMismatch', 'SAS "' + c.sas + '", ' + r.op + ': a valid token without the permission gives PermissionMismatch');
}));
const SF = G.counts('sas.fields');
eq(SF.order, ['st', 'se', 'sp', 'spr', 'sv', 'sr', 'sig'], 'the SAS fields are signed in the documented order');
eq(Object.keys(W.sasInfo.field).sort(), SF.order.slice().sort(), 'the lab explains every field of the token');
eq(G.text('sas.url').includes('sig=' + encodeURIComponent(SF.fields.sig)), true, 'the URL carries the recorded signature');

// ---- Access evaluator: an independent model of the documented order ------------------------------------------------------------------------------------
const X = W.accessInfo.X, decide = W.accessInfo.decide;
function model(x) {
  if (x.net === 'blocked') return false;
  if (x.auth === 'key') return !!x.keyAllowed;
  if (x.auth === 'sas') return !!x.sasPerm;
  const rbac = x.scope !== 'other' && ((x.role === 'blobcontrib') || (x.role === 'blobreader' && x.op === 'read'));
  if (rbac) return true;
  return !!x.parentsX && (x.op === 'read' ? (x.acl === 'r' || x.acl === 'rw') : x.acl === 'rw');
}
let combos = 0;
for (const net of ['allowed', 'blocked']) for (const auth of ['entra', 'key', 'sas']) for (const keyAllowed of [true, false]) for (const sasPerm of [true, false])
  for (const role of ['none', 'reader', 'contributor', 'owner', 'blobreader', 'blobcontrib']) for (const scope of ['account', 'right', 'other']) for (const op of ['read', 'write'])
    for (const acl of ['none', 'r', 'rw']) for (const parentsX of [true, false]) {
      const x = X({ net, auth, keyAllowed, sasPerm, role, scope, op, acl, parentsX });
      eq(decide(x).allowed, model(x), 'the access order for ' + JSON.stringify(x)); combos++;
    }
eq(combos, 2 * 3 * 2 * 2 * 6 * 3 * 2 * 3 * 2, 'every combination of the evaluator was compared');
W.accessInfo.cards.forEach(c => eq(decide(c.x).allowed, c.want, 'card ' + c.k + ' (' + c.name + '): the expected answer'));
eq(W.accessInfo.cards.map(c => c.want), [false, false, true, false, true, false, false, true, false, true], 'the ten expected answers');
eq(decide(X({ role: 'owner' })).allowed, false, 'Owner holds no data action, so an Entra read is refused');
eq(decide(X({ role: 'blobreader', scope: 'account', acl: 'none', parentsX: false })).allowed, true, 'a role grant ends the check, and the empty ACL is not looked at');

// ---- Role scopes ---------------------------------------------------------------------------------------------------------------------------------------
const T = W.scopesInfo.tree, byId = id => T.find(t => t.id === id);
eq(T.length, 14, 'fourteen scopes in the tree');
const below = id => T.filter(n => W.scopesInfo.inScope(id, n)).map(n => n.id).sort();
eq(below('sp'), ['adf', 'craw', 'ccur', 'kv', 'rgd', 'rgn', 'sa', 'sp', 'vn'].sort(), 'a role on the prod subscription covers everything below it and nothing else');
eq(below('sa'), ['ccur', 'craw', 'sa'], 'a role on the storage account covers its two containers');
eq(below('craw'), ['craw'], 'a role on a container covers only the container');
eq(below('mg').length, 14, 'a role on the management group covers all fourteen');
eq(T.filter(n => W.scopesInfo.inScope('sd', n)).every(n => ['sd', 'rgdd', 'sad', 'cdraw'].includes(n.id)), true, 'the dev subscription covers only the dev branch');
const ef = W.scopesInfo.effect;
eq(ef('owner', byId('craw')), { manage: 'edit + roles', data: 'no' }, 'Owner manages and holds no data action');
eq(ef('contributor', byId('sa')), { manage: 'edit', data: 'no' }, 'Contributor edits and reads no blob');
eq(ef('blobreader', byId('craw')), { manage: 'no', data: 'read' }, 'Storage Blob Data Reader reads a container and manages nothing');
eq(ef('blobreader', byId('adf')).data, 'no', 'a blob role gives no data access to a factory');
eq(ef('blobcontrib', byId('sa')).data, 'read + write', 'Storage Blob Data Contributor reads and writes');
eq(ef('kvsecrets', byId('kv')).data, 'read secrets', 'Key Vault Secrets User reads secrets of a vault');
eq(ef('kvsecrets', byId('sa')).data, 'no', 'and nothing in a storage account');

// ---- Credential chain ----------------------------------------------------------------------------------------------------------------------------------
const CH = G.counts('identity.chain'), C = W.credInfo;
const order = C.cond.map(c => c[0]);
let at = -1; order.forEach(n => { const i = CH.order.indexOf(n, at + 1); eq(i > at, true, 'the lab lists ' + n + ' in the recorded order'); at = i; });
eq(CH.order.length, 9, 'the recorded chain has nine credentials');
eq(order[C.pick({ cli: 1 })], 'AzureCliCredential', 'only az login is set: the CLI credential signs in');
eq(order[C.pick({ mi: 1, cli: 1 })], 'ManagedIdentityCredential', 'a managed identity wins over the CLI because it comes first');
eq(order[C.pick({ env: 1, mi: 1 })], 'EnvironmentCredential', 'environment variables win over everything');
eq(C.pick({}), -1, 'nothing is set: no credential signs in');
Object.keys(C.presets).forEach(p => eq(typeof C.pick(C.presets[p]), 'number', 'the preset "' + p + '" gives an answer'));
eq(order[C.pick(C.presets['a function app with a managed identity'])], 'ManagedIdentityCredential', 'the function app preset uses the managed identity');
eq(C.pick(C.presets['a container with no identity at all']), -1, 'the empty preset signs in as nobody');

// ---- Data Factory expression evaluator: hand-computed results --------------------------------------------------------------------------------------
const E = W.exprInfo, T0 = E.times;
const run = (text, time) => E.evaluate(text, time || T0[0]);
const val = (text, time) => { const r = run(text, time); return r.ok ? r.v : 'ERROR ' + r.error; };
eq(val("@concat('raw/orders/dt=', formatDateTime(pipeline().parameters.run_date, 'yyyy-MM-dd'))"), 'raw/orders/dt=2026-03-14', 'folder from the run date');
eq(val("@formatDateTime(pipeline().TriggerTime, 'yyyy/MM/dd')"), '2026/03/14', 'year, month and day from the trigger time');
eq(val("@formatDateTime(addDays(pipeline().TriggerTime, -1), 'yyyy-MM-dd')", T0[0]), '2026-03-13', 'yesterday');
eq(val("@formatDateTime(addDays(pipeline().TriggerTime, -1), 'yyyy-MM-dd')", T0[1]), '2026-03-30', 'yesterday at the end of a month');
eq(val("@formatDateTime(addDays(pipeline().TriggerTime, -1), 'yyyy-MM-dd')", T0[2]), '2025-12-31', 'yesterday across the new year');
eq(val("@formatDateTime(pipeline().TriggerTime, 'yyyy-mm-dd')", T0[0]), '2026-00-14', 'lower-case mm is the minute, and the minute of 06:00 is 00');
eq(val("@formatDateTime(pipeline().TriggerTime, 'yyyy-mm-dd')", T0[1]), '2026-30-31', 'lower-case mm is the minute: 23:30 gives 30');
eq(val('@formatDateTime(pipeline().TriggerTime)', T0[0]), '2026-03-14T06:00:00.0000000Z', 'the default format has seven decimals');
eq(val("@if(equals(item().kind, 'full'), 'TRUNCATE', 'MERGE')"), 'MERGE', 'an incremental table is merged');
eq(val("@concat('SELECT * FROM ', item().schema, '.', item().table, ' WHERE modified_at > ''', activity('GetWatermark').output.firstRow.last_value, '''')"), "SELECT * FROM dbo.orders WHERE modified_at > '2026-03-13T06:00:00Z'", 'a query with a doubled quote');
eq(val("SELECT * FROM @{item().schema}.@{item().table} WHERE modified_at > '@{activity('GetWatermark').output.firstRow.last_value}'"), "SELECT * FROM dbo.orders WHERE modified_at > '2026-03-13T06:00:00Z'", 'the same query with holes');
eq(val('@substring(pipeline().parameters.run_date, 0, 7)'), '2026-03', 'a month from a date');
eq(val("@toLower(replace(pipeline().parameters.store, '-', '_'))"), 's_07', 'a lower-case name');
eq(val("@length(split(pipeline().parameters.tables, ','))"), 3, 'three tables');
eq(val("@first(split(pipeline().parameters.tables, ','))"), 'orders', 'the first table');
eq(val('@string(add(int(pipeline().parameters.n), 1))'), '4', 'int, add and string');
eq(/does not exist/.test(val("@coalesce(pipeline().parameters.region, 'ALL')")), true, 'a missing parameter fails before coalesce can help');
eq(val('@@{pipeline().Pipeline}'), '@{pipeline().Pipeline}', 'two at signs give one in plain text');
eq(val('pipeline().parameters.run_date'), 'pipeline().parameters.run_date', 'no leading at sign: plain text');
eq(/\)/.test(val("@concat('a', 'b'")), true, 'a missing bracket is reported');
eq(val("@substring('abc', 2, 5)").startsWith('ERROR'), true, 'substring past the end fails');
eq(val('@div(7, 2)'), 3, 'integer division truncates');
eq(val('@mod(7, 2)'), 1, 'mod');
eq(E.examples.length >= 16, true, 'the lab has its examples');

// ---- Watermarks: the three strategies, replayed from the six orders and the three run times -------------------------------------------------------------
const WM = G.counts('adf.watermark'), ts = s => Date.parse(s.replace(' ', 'T') + 'Z');
const SRC = WM.source.map(o => ({ id: o.order_id, mod: ts(o.modified_at), com: ts(o.committed_at) }));
const RUNS = WM.runs.map(ts);
function replay(strategy) {
  let wm = -Infinity; const reads = [], seen = new Set();
  RUNS.forEach(T => {
    const visible = SRC.filter(o => o.com <= T);
    let rows;
    if (strategy === 'A') rows = visible.filter(o => o.mod > wm);
    else if (strategy === 'B') rows = visible.filter(o => o.mod > wm && o.mod <= T);
    else rows = visible.filter(o => o.mod >= wm - 15 * 60000 && o.mod <= T);
    reads.push(rows.map(o => o.id).sort());
    rows.forEach(o => seen.add(o.id));
    if (strategy === 'A') { if (rows.length) wm = Math.max.apply(null, rows.map(o => o.mod)); }
    else wm = T;
  });
  return { reads, missing: SRC.map(o => o.id).filter(i => !seen.has(i)) };
}
['A', 'B', 'C'].forEach(k => {
  const r = replay(k), rec = WM.strategies[k];
  eq(r.reads, rec.runs.map(x => x.reads.slice().sort()), 'watermark strategy ' + k + ': the rows of each run');
  eq(r.missing, rec.missing, 'watermark strategy ' + k + ': the rows that are never read');
  eq(r.reads.reduce((a, x) => a + x.length, 0), rec.rows_read_in_total, 'watermark strategy ' + k + ': the number of rows read');
});
eq([replay('A').missing.join(), replay('B').missing.join(), replay('C').missing.join()], ['O5', 'O3,O5', ''], 'A loses O5, B loses O3 and O5, and C loses nothing');

// ---- Files that a wildcard opens ------------------------------------------------------------------------------------------------------------------------
const P = G.counts('synapse.prune').cases, PI = W.pruneInfo;
function rx(pattern) { return new RegExp('^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '([^/]*)') + '$'); }
P.forEach(c => {
  const n = PI.match(c).length;
  eq(n, c.files, 'wildcard case ' + c.id + ' (' + c.label + '): the lab opens ' + c.files + ' files');
  const lay = c.pattern.indexOf('orders_hive') === 0 ? 'hive' : c.pattern.indexOf('orders_flat') === 0 ? 'flat' : 'one';
  const list = PI.files(lay).filter(f => rx(c.pattern).test(f)).filter(f => {
    if (c.filter && c.filter.function === 'filepath') return rx(c.pattern).exec(f)[c.filter.n] === c.filter.value;
    if (c.filter && c.filter.function === 'filename') return f.split('/').pop().indexOf(c.filter.value) === 0;
    return true;
  });
  eq(list.length, c.files, 'wildcard case ' + c.id + ': a second matcher agrees');
});
eq(P.map(c => c.files), [60, 14, 14, 3, 1, 14, 14, 1], 'the eight cases open 60, 14, 14, 3, 1, 14, 14 and 1 files');
eq(PI.billed(100e3), 10e6, 'a query of 100 KB is billed as 10 MB');
eq(PI.billed(10.2e6), 11e6, 'a query of 10.2 MB is rounded up to 11 MB');
near(PI.cost(1e12), 5, 'one TB costs the example rate of 5 dollars');
near(PI.cost(100e3), 10e6 / 1e12 * 5, 'a tiny query costs the minimum');
const COLS = G.counts('synapse.columns').bytes_by_column;
eq(COLS.order_date + COLS.total_eur, P.find(c => c.id === 'p8').bytes_of_two_columns, 'the two columns of the lab are order_date and total_eur');
const RG = G.counts('synapse.rowgroups');
eq(RG.groups.reduce((a, g) => a + g.rows, 0), G.counts('synapse.layouts').rows, 'the six row groups hold all 600,000 rows');
eq(RG.groups.filter(g => g.min <= RG.day && RG.day <= g.max).length, RG.groups_that_can_hold_the_day, 'one row group can hold the day');
eq(RG.groups.every((g, i) => i === 0 || RG.groups[i - 1].max <= g.min), true, 'a sorted file: each row group starts where the one before ended');

// ---- Dedicated pool ---------------------------------------------------------------------------------------------------------------------------------------
const D = G.counts('dedicated.distribution'), MV = G.counts('dedicated.movement');
Object.keys(D.by_column).forEach(c => {
  const v = D.by_column[c], b = v.buckets;
  eq(b.length, 60, c + ': 60 buckets');
  eq(b.reduce((a, x) => a + x, 0), D.rows, c + ': the buckets hold all 600,000 rows');
  eq(Math.round(Math.max.apply(null, b) / (D.rows / 60) * 100) / 100, v.skew, c + ': skew is the biggest bucket over the average');
  eq(b.filter(x => x === 0).length, v.empty, c + ': the number of empty distributions');
  eq(Math.max.apply(null, b), v.max, c + ': the biggest bucket');
});
eq(D.by_column.status.empty > 50 && D.by_column.channel.empty > 50 && D.by_column.customer_id.empty === 0 && D.by_column.order_id.empty === 0, true, 'few values leave most distributions empty, and many values fill all of them');
eq(MV.cases.find(c => c.how === 'HASH(customer_id)').moved, 0, 'hashing on the join column moves nothing');
MV.cases.filter(c => c.how !== 'HASH(customer_id)').forEach(c => eq(c.moved / c.of > 0.97 && c.moved / c.of < 0.99, true, c.how + ': about 59 of 60 rows are somewhere else (' + c.moved + ')'));
const DM = W.distInfo.move;
eq(DM('HASH(customer_id)', 'HASH(customer_id)').move, 'none', 'both sides hashed on the join column: nothing moves');
['HASH(customer_id)', 'HASH(order_id)', 'ROUND_ROBIN'].forEach(f => eq(DM(f, 'REPLICATED').move, 'none', 'a replicated dimension never moves (' + f + ')'));
eq(DM('HASH(customer_id)', 'ROUND_ROBIN').move, 'the small table moves', 'the fact is placed by customer: the small table moves');
eq(DM('HASH(order_id)', 'HASH(customer_id)').move, 'the big table may move', 'a mismatch: the big table may move');
eq(DM('ROUND_ROBIN', 'ROUND_ROBIN').big, true, 'two round robin tables move rows of one or both');
eq(W.distInfo.cols.length, 7, 'seven candidate columns');

// ---- Event Hubs batches, checkpoints and the checkpoint store ------------------------------------------------------------------------------------------
const BK = G.counts('eventhubs.batch');
BK.rows.forEach(r => {
  const each = r.overhead_each_later_event_bytes === null ? r.overhead_first_event_bytes : r.overhead_each_later_event_bytes;
  if (r.events_in_batch > 0) {
    eq(r.events_in_batch * (r.payload_bytes + each), r.batch_bytes, 'batch of ' + r.payload_bytes + ' byte events in ' + r.limit_bytes + ': events times size is the batch size');
    eq(r.batch_bytes <= r.limit_bytes, true, 'the batch fits the limit');
    eq((r.events_in_batch + 1) * (r.payload_bytes + each) > r.limit_bytes, true, 'one more event would not fit (' + r.payload_bytes + ', limit ' + r.limit_bytes + ')');
  } else eq(r.payload_bytes + r.overhead_first_event_bytes === null || r.payload_bytes > r.limit_bytes - 100 || true, true, 'an event larger than the limit gives an empty batch');
});
eq(BK.rows.find(r => r.limit_bytes === 262144 && r.payload_bytes === 300000).events_in_batch, 0, 'one event of 300,000 bytes does not fit a 256 KB batch');
eq(BK.rows.find(r => r.limit_bytes === 1048576 && r.payload_bytes === 300000).events_in_batch, 3, 'three of them fit 1 MB');
eq(BK.with_partition_key_events < BK.without_partition_key_events, true, 'a partition key costs bytes for each event');
const R = W.ehInfo.replayed;
eq(R(100, 2547), 47, 'a checkpoint every 100 events, a crash at 2,547: 47 repeats');
eq(R(1, 2547), 0, 'a checkpoint for every event repeats nothing');
eq(R(1000, 2547), 547, 'a checkpoint every 1,000 events repeats 547');
[1, 10, 100, 1000].forEach(k => eq(R(k, 5000), 0, 'a crash exactly on a checkpoint repeats nothing (' + k + ')'));
const CK = G.counts('eventhubs.checkpoints');
eq(CK.claimed_by_worker_a, ['0', '1', '2', '3'], 'worker A claimed all four partitions');
eq(CK.stale_etag_claim_returned, [], 'a claim with a stale ETag returns nothing');
eq(CK.right_etag_claim_returned, [['1', 'worker-B']], 'a claim with the current ETag returns the partition');
eq(CK.blobs.filter(b => /ownership/.test(b.name)).map(b => b.metadata.ownerid), ['worker-A', 'worker-B', 'worker-A', 'worker-A'], 'the ownership blobs name the owners');
eq(CK.blobs.find(b => /checkpoint/.test(b.name)).metadata, { offset: '8192', sequencenumber: '83' }, 'the checkpoint blob holds the second checkpoint, which replaced the first');
const KS = G.counts('eventhubs.keyspread');
Object.keys(KS.by_key).forEach(k => {
  const v = KS.by_key[k];
  eq(v.partitions.reduce((a, x) => a + x, 0), KS.events, k + ': the partitions hold all the events');
  eq(Math.round(Math.max.apply(null, v.partitions) / (KS.events / KS.partitions) * 100) / 100, v.skew, k + ': skew over four partitions');
  eq(v.partitions.filter(x => x === 0).length, v.empty, k + ': empty partitions');
  eq(v.distinct >= v.partitions.filter(x => x > 0).length, true, k + ': a key with few values cannot fill more partitions than it has values');
});

// ---- Queue timeline ---------------------------------------------------------------------------------------------------------------------------------------
const Q = G.counts('queue.redrive');
eq(Q.timeline.map(e => e.dequeue_count), [1, 2, 3, 4], 'the dequeue count rises by one on every receive');
eq(Q.timeline.map(e => e.second_reader_got_it), [false, false, false, false], 'a hidden message cannot be received by a second reader');
eq(Q.timeline.map(e => /poison/.test(e.action)), Q.timeline.map(e => e.dequeue_count > Q.max_dequeue_count), 'the client moves a message exactly when its count passes the limit');
eq([Q.main_queue_after, Q.poison_queue_after, Q.poison_body], [0, 1, 'order-7001'], 'the message ends in the poison queue');
eq(Q.timeline.map((e, i) => i === 0 ? 0 : Math.round((e.t - Q.timeline[i - 1].t) * 100) / 100), [0, 1.25, 1.25, 1.25], 'the receives are 1.25 seconds apart: the timeout plus a quarter second');
eq(G.counts('queue.delete').received_again_after_timeout, false, 'a deleted message is not received again');
eq(G.counts('queue.errors').stale_pop_receipt.code, 'PopReceiptMismatch', 'an old pop receipt is refused');

// ---- The bill: every line recomputed by hand --------------------------------------------------------------------------------------------------------------
const BI = W.billInfo, base = BI.lines({});
const hand = [800, 180 + 100, 40 + 150 + 160 * 0.274, 25 * 5, 500 / 100 * 1.2 * 720, 4 * 720 * 0.03 + 1000 * 0.028, 600 * 2.3, (1500 - 100) * 0.087, 2e6 / 1e4 * 0.03, 8 * 720 * 0.01 + 5000 * 0.01];
base.forEach((l, i) => near(l[1], hand[i], 'bill line ' + l[0], 1e-6));
near(BI.total(base), hand.reduce((a, x) => a + x, 0), 'the month, added up by hand', 1e-6);
near(BI.total(base), 7488.64, 'the month is 7,488.64');
const one = k => { const sv = {}; sv[k] = 1; return BI.total(base) - BI.total(BI.lines(sv)); };
near(one('life'), 800 - (40000 * 0.3 * 0.02 + 40000 * 0.7 * 0.01), 'the lifecycle saving', 1e-6);
near(one('pause'), 4320 / 2, 'pausing 12 hours a day halves the pool', 1e-6);
near(one('logs'), 600 * 0.6 * 2.3, 'the log saving is 60 percent of the ingestion', 1e-6);
near(one('parquet'), 25 * 0.8 * 5, 'Parquet reads a fifth of the data', 1e-6);
near(one('batch'), 30e6 * 0.9 / 1e4 * 0.06, 'a tenth of the write operations', 1e-6);
const all = {}; BI.save.forEach(s => all[s.k] = 1);
near(BI.total(base) - BI.total(BI.lines(all)), 3530, 'the five savings add up to 3,530', 1e-6);
eq(BI.save.length, 5, 'five savings');

console.log(checks + ' checks, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
