// Checks the logic of the lab widgets against the recording and against arithmetic done by hand.
// Run: node aws/verify/check_widgets.js
const fs = require('fs'), path = require('path'), crypto = require('crypto');
global.window = global; global.LAB = {};
const root = path.join(__dirname, '..', '..');
const shared = path.join(root, 'shared', 'js') + '/', tut = path.join(root, 'aws', 'js') + '/';
const load = f => { (0, eval)(fs.readFileSync(f, 'utf8')); };
['config.js', 'real.js'].forEach(f => load(tut + f));
load(shared + 'util.js'); load(tut + 'helpers.js'); load(shared + 'graph.js'); load(shared + 'term.js'); load(tut + 'graphs.js');
load(shared + 'render1.js'); load(shared + 'render2.js'); load(tut + 'widgets.js');

const W = LAB.W, G = LAB.get;
let checks = 0, fails = 0;
const eq = (got, want, what) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) { fails++; console.log('FAIL:', what, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };
const near = (got, want, what, tol) => { checks++; if (Math.abs(got - want) > (tol || 1e-9)) { fails++; console.log('FAIL:', what, 'got', got, 'want', want); } };
const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();
const sha = s => crypto.createHash('sha256').update(s).digest('hex');

// ---- S3 listing: apply the documented rule to the ten keys and compare with what the emulator returned ----------
const KEYS = G.counts('s3.keys').keys;
eq(KEYS.length, 10, 'the bucket holds ten objects');
function listRule(prefix, delim) {
  const under = KEYS.filter(k => k.startsWith(prefix)), cps = [], keys = [];
  under.forEach(k => {
    const rest = k.slice(prefix.length), i = delim ? rest.indexOf(delim) : -1;
    if (i >= 0) { const cp = prefix + rest.slice(0, i + 1); if (!cps.includes(cp)) cps.push(cp); } else keys.push(k);
  });
  return { common_prefixes: cps.sort(), keys: keys.sort(), key_count: cps.length + keys.length };
}
const recorded = G.counts('s3.listing');
eq(recorded.length, 14, 'seven prefixes and two delimiters make 14 recorded calls');
recorded.forEach(r => { const w = listRule(r.prefix, r.delimiter); eq({ common_prefixes: r.common_prefixes, keys: r.keys, key_count: r.key_count }, w, 'listing with prefix "' + r.prefix + '" and delimiter "' + r.delimiter + '" follows the rule'); });
eq(W.listingInfo.find('raw/ord', '/').common_prefixes, ['raw/orders/'], 'a partial name is not a folder: raw/ord with / rolls up to raw/orders/');
const pg = G.counts('s3.pages');
eq(pg.pages.map(p => p.keys.length), [4, 4, 2], 'ten keys in pages of four');
eq(pg.pages.map(p => p.is_truncated), [true, true, false], 'only the last page is not truncated');
eq(pg.paginator_page_sizes, [4, 4, 2], 'the paginator gives the same pages');

// ---- S3 versioning: replay the six calls with a model of the documented rules ----------------------------------
const VS = W.versionsInfo.steps();
let stack = [];                                  // newest first; entries {id, marker}
const model = [
  () => stack.unshift({ id: 'v1', marker: false }),
  () => stack.unshift({ id: 'v2', marker: false }),
  () => stack.unshift({ id: 'dm1', marker: true }),
  () => { stack = stack.filter(x => x.id !== 'v1'); },
  () => { stack = stack.filter(x => x.id !== 'dm1'); },
  () => { stack = stack.filter(x => x.id !== 'v2'); }
];
VS.forEach((step, n) => {
  model[n]();
  const top = stack[0];
  eq({ versions: stack.filter(x => !x.marker).map(x => x.id).sort(), markers: stack.filter(x => x.marker).map(x => x.id) }, { versions: step.state.versions.map(x => x.id).sort(), markers: step.state.delete_markers.map(x => x.id) }, 'versioning step ' + (n + 1) + ': the stack');
  eq(step.read.ok, !!top && !top.marker, 'versioning step ' + (n + 1) + ': a plain GET works only when the top of the stack is a version');
  if (!step.read.ok) eq([step.read.code, step.read.status], ['NoSuchKey', 404], 'versioning step ' + (n + 1) + ': a missing or deleted key answers NoSuchKey 404');
  eq(step.state.versions.concat(step.state.delete_markers).filter(x => x.latest).length, stack.length ? 1 : 0, 'versioning step ' + (n + 1) + ': exactly one entry is current');
});
eq(VS[2].state.delete_markers.length, 1, 'a delete without a version id adds a delete marker');
eq(VS[2].state.versions.length, 2, 'and removes no version');

// ---- SigV4: recompute the chain with node crypto, independent of Python and botocore --------------------------------
const ks = G.counts('sigv4.keys'), canon = G.text('sigv4.canonical_request'), sts = G.text('sigv4.string_to_sign');
const SECRET = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
const kDate = hmac('AWS4' + SECRET, '20130524'), kRegion = hmac(kDate, 'us-east-1'), kService = hmac(kRegion, 's3'), kSigning = hmac(kService, 'aws4_request');
eq([kDate, kRegion, kService, kSigning].map(b => b.toString('hex')), [ks.kDate, ks.kRegion, ks.kService, ks.kSigning], 'the four signing keys, recomputed in JavaScript');
eq(hmac(kSigning, sts).toString('hex'), ks.signature, 'the signature, recomputed in JavaScript from the string to sign');
eq(sts.split('\n').slice(-1)[0], sha(canon), 'the last line of the string to sign is the SHA-256 of the canonical request');
eq(sts.split('\n').slice(0, 3), ['AWS4-HMAC-SHA256', '20130524T000000Z', '20130524/us-east-1/s3/aws4_request'], 'the first three lines of the string to sign');
eq(ks.signature, 'f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41', 'the signature printed in the AWS documentation');
eq(ks.matches_the_documentation, true, 'the recording says it matches the documentation');
eq(canon.split('\n').slice(-1)[0], sha(''), 'the payload hash is the SHA-256 of an empty body');
const parts = W.sigInfo.parts, lines = W.sigInfo.lines();
eq(parts.map(p => p.find(lines)), [[1, 1], [2, 2], [3, 3], [4, 7], [9, 9], [10, 10]], 'the highlighted lines of the canonical request');
eq(lines.slice(3, 7).map(l => l.split(':')[0]), ['host', 'range', 'x-amz-content-sha256', 'x-amz-date'], 'four signed headers in sorted order');
const vr = G.table('sigv4.variants').rows;
eq(vr.map(r => r[3]), ['yes', 'no', 'no', 'no', 'no', 'no'], 'only the documentation example gives the documented signature');
eq(new Set(vr.map(r => r[2])).size, 6, 'six different signatures');
vr.slice(1).forEach(r => { let d = 0; for (let k = 0; k < r[2].length; k++) if (r[2][k] !== vr[0][2][k]) d++; eq(d > 40, true, 'a small change moves most of the 64 characters: ' + r[0] + ' (' + d + ')'); });
// the variant with a wrong last character of the secret key, recomputed
{
  const bad = SECRET.slice(0, -1) + 'Z', k1 = hmac(hmac(hmac(hmac('AWS4' + bad, '20130524'), 'us-east-1'), 's3'), 'aws4_request');
  eq(hmac(k1, sts).toString('hex'), vr[1][2], 'the wrong-secret signature, recomputed in JavaScript');
}

// ---- IAM evaluator ----------------------------------------------------------------------------------------------------
const E = W.evaluatorInfo, rows = G.counts('iam.truth').rows;
eq(rows.length, 10, 'ten recorded requests');
eq(rows.map((r, n) => E.decide(E.truthLayers(n)).allowed ? 'allow' : 'deny'), rows.map(r => r.result), 'the rule gives the same answer as the emulator for all ten requests');
E.cards.forEach(c => eq(E.decide(c.x).allowed, c.want, 'card "' + c.name + '"'));
const base = { idAllow: true, idDeny: false, resAllow: false, resDeny: false, scp: 'none', bnd: 'none', same: true };
const d = o => E.decide(Object.assign({}, base, o));
eq(d({}).allowed, true, 'an identity allow in the same account is enough');
eq(d({ idAllow: false }).allowed, false, 'nothing allows it: implicit deny');
eq(d({ idAllow: false, resAllow: true }).allowed, true, 'a resource policy alone is enough in the same account');
eq(d({ idAllow: false, resAllow: true, same: false }).allowed, false, 'across accounts a resource allow alone is not enough');
eq(d({ resAllow: true, same: false }).allowed, true, 'across accounts both allow');
eq(d({ idDeny: true }).allowed, false, 'an identity deny beats an identity allow');
eq(d({ resDeny: true, resAllow: true }).allowed, false, 'a resource deny beats a resource allow');
eq(d({ scp: 'blocks' }).allowed, false, 'an SCP that does not allow it blocks it');
eq(d({ scp: 'allows' }).allowed, true, 'an SCP that allows it grants nothing by itself, but it does not block');
eq(d({ idAllow: false, scp: 'allows' }).allowed, false, 'an SCP allow alone is not a grant');
eq(d({ bnd: 'blocks' }).allowed, false, 'a boundary that does not allow it caps the identity grant');
eq(d({ bnd: 'blocks', resAllow: true }).allowed, true, 'a boundary caps identity grants only, so a resource grant still works in the same account');
eq(d({ bnd: 'allows' }).allowed, true, 'a boundary that allows it does not block');
{ // every combination: a deny anywhere always means deny
  let n = 0;
  [true, false].forEach(ia => [true, false].forEach(id => [true, false].forEach(ra => [true, false].forEach(rd => ['none', 'allows', 'blocks'].forEach(sc => ['none', 'allows', 'blocks'].forEach(bn => [true, false].forEach(sm => {
    const x = { idAllow: ia, idDeny: id, resAllow: ra, resDeny: rd, scp: sc, bnd: bn, same: sm }, r = E.decide(x).allowed;
    if (id || rd) { n++; if (r) eq('allowed', 'denied', 'a deny must win: ' + JSON.stringify(x)); }
    if (sc === 'blocks' && r) eq('allowed', 'denied', 'an SCP block must win: ' + JSON.stringify(x));
  }))))))); checks++; eq(n > 0, true, 'combinations with a deny were visited');
}

// ---- Kinesis: MD5 in JavaScript against the recorded shard of every key ---------------------------------------------------
const sh = G.counts('kinesis.shards'), mp = G.counts('kinesis.mapping').rows, TOP = (1n << 128n) - 1n;
eq(sh.max_hash, TOP.toString(), 'the top of the hash range is 2^128 - 1');
eq(sh.shards.map(s => s.share_of_the_ring), [0.25, 0.25, 0.25, 0.25], 'four equal shards');
eq(sh.shards.every((s, k) => k === 0 ? s.start === '0' : BigInt(s.start) === BigInt(sh.shards[k - 1].end) + 1n), true, 'the ranges touch with no gap');
mp.forEach(r => {
  const h = BigInt('0x' + crypto.createHash('md5').update(r.key).digest('hex')), shard = sh.shards.find(s => BigInt(s.start) <= h && h <= BigInt(s.end));
  eq(crypto.createHash('md5').update(r.key).digest('hex'), r.md5, 'MD5 of ' + r.key);
  eq(shard.id, r.shard, 'shard of ' + r.key + ' by the documented rule');
  near(Number(h) / Math.pow(2, 128), r.ring_position, 'ring position of ' + r.key, 6e-5);
});
const sk = G.counts('kinesis.skew');
eq(Object.values(sk.by_key).reduce((a, b) => a + b, 0), 20000, 'every event reached a shard (by key)');
eq(Object.values(sk.salted_8).reduce((a, b) => a + b, 0), 20000, 'every event reached a shard (salted)');
near(+(Math.max(...Object.values(sk.by_key)) / 5000).toFixed(2), sk.by_key_ratio, 'busiest shard against the mean, by key');
near(+(Math.max(...Object.values(sk.salted_8)) / 5000).toFixed(2), sk.salted_ratio, 'busiest shard against the mean, salted');
eq(sk.by_key_ratio > 1.5 && sk.salted_ratio < 1.2, true, 'a salt evens out the shards');
const spl = G.counts('kinesis.split');
eq(spl.after.length, spl.before.length + 2, 'a split adds two shards');
eq(spl.after.filter(x => x.state === 'closed').map(x => x.id), [spl.split], 'the parent closes');
eq(spl.after.filter(x => x.parent === spl.split).map(x => x.share_of_the_ring), [0.125, 0.125], 'two children share the parent range');

// ---- Athena scan: arithmetic worked out by hand ----------------------------------------------------------------------------
const S = W.scanInfo, sc = G.counts('athena.scan'), sizes = G.counts('athena.sizes'), pc = G.counts('athena.parquet_columns');
near(S.cost(1e12, 1), 5, 'one terabyte costs $5', 1e-9);
near(S.cost(1e6, 1), 10e6 / 1e12 * 5, 'a 1 MB read is billed as 10 MB', 1e-12);
near(S.cost(166660475, 1), 167e6 / 1e12 * 5, 'the CSV file, billed to the next MB', 1e-12);
near(S.cost(166660475, 1000), 166660475000 / 1e12 * 5 + 0, 'the CSV file at a scale of 1,000 is about $0.83', 1e-3);
eq(S.billed(0), 10e6, 'nothing read is still the 10 MB minimum');
eq(S.billed(10e6 + 1), 11e6, 'bytes are rounded up to the next MB');
eq(sc.queries.map(q => q.id), ['q1', 'q2', 'q3', 'q4', 'q5'], 'five queries');
eq(sc.layouts.map(l => l.k), ['csv', 'csv_gz', 'csv_by_day', 'parquet', 'parquet_by_day'], 'five layouts');
sc.queries.forEach(q => { eq(G.file('athena/' + q.id + '.sql'), q.sql, q.id + ': the SQL file is the SQL shown'); eq(q.bytes.csv, sizes.csv, q.id + ': CSV reads the whole file'); eq(q.bytes.csv_gz, sizes.csv_gz, q.id + ': gzip CSV reads the whole file'); });
const q = id => sc.queries.find(x => x.id === id);
eq(q('q1').bytes.parquet, sizes.parquet_footer_bytes, 'count(*) on one Parquet file reads only the footer');
eq(q('q5').bytes.parquet, sizes.parquet_footer_bytes + pc.bytes_by_column.status, 'one column over every row group: the footer and that column');
eq(q('q2').bytes.csv_by_day, Math.round(sizes.avg_day_csv_bytes) > 0 ? q('q2').bytes.csv_by_day : 0, 'q2 CSV by day is one day file');
eq(q('q2').bytes.csv_by_day < sizes.csv_by_day / 80, true, 'one day of 90 is about a ninetieth of the partitioned CSV');
eq(q('q3').bytes.csv_by_day < sizes.csv_by_day && q('q3').bytes.csv_by_day > sizes.csv_by_day * 0.3, true, '31 days of 90 are about a third');
eq(q('q4').bytes.parquet > q('q5').bytes.parquet, true, 'SELECT * on one row group reads more than one column of every row group here');
eq(sizes.csv > sizes.csv_gz * 4, true, 'gzip makes this CSV at least four times smaller');
eq(sizes.parquet < sizes.csv_gz * 1.3, true, 'Parquet is about the size of gzip CSV');
eq(Object.keys(pc.bytes_by_column).length, 11, 'eleven columns');
eq(Object.values(pc.bytes_by_column).reduce((a, b) => a + b, 0) + sizes.parquet_footer_bytes < sizes.parquet + 1, true, 'columns and footer fit inside the file');
eq(sizes.rows, 2000000, 'two million rows');
eq(G.table('athena.q1_result').rows[0][0], '2000000', 'DuckDB counted two million orders');
eq(G.table('athena.q5_result').rows.map(r => +r[1]).reduce((a, b) => a + b, 0), 2000000, 'the statuses add up to two million');

// ---- SQS ---------------------------------------------------------------------------------------------------------------------
const rd = G.counts('sqs.redrive');
eq(W.sqsInfo.where.length, rd.timeline.length, 'a location for every step of the timeline');
eq(rd.timeline.map(x => x.receive_count), [1, null, 2, null], 'receive counts: 1, nothing (hidden), 2, nothing (moved)');
eq(rd.timeline.map(x => x.received), [true, false, true, false], 'which calls got the message');
eq([rd.visibility_timeout_seconds, rd.max_receive_count, rd.main_queue_depth_at_end], [2, 2, 0], 'timeout 2 s, limit 2 receives, empty main queue at the end');
eq(rd.dlq_message_body, '{"order_id": "O-5001"}', 'the dead-letter queue holds the original message');
eq(G.counts('sqs.delete'), { received_again_after_timeout: false, received_first_time: true }, 'a deleted message does not come back');
eq(G.counts('sqs.fifo').received_in_order, ['order 1', 'order 2'], 'the repeated deduplication id delivered once');
eq([G.counts('sns.fanout').analytics_count, G.counts('sns.fanout').billing_count], [2, 1], 'the filter policy kept CANCELLED from billing');

// ---- Step Functions retry schedule -----------------------------------------------------------------------------------------
const R = W.retryInfo.schedule;
eq(R({ interval: 30, rate: 2, attempts: 5, maxDelay: 0 }).rows.map(r => r.wait), [30, 60, 120, 240, 480], 'interval 30, rate 2, five attempts: 30, 60, 120, 240, 480');
eq(R({ interval: 30, rate: 2, attempts: 5, maxDelay: 0 }).total, 930, 'which is 930 seconds in all');
eq(R({ interval: 30, rate: 2, attempts: 5, maxDelay: 300 }).rows.map(r => r.wait), [30, 60, 120, 240, 300], 'a cap of 300 seconds');
eq(R({ interval: 30, rate: 2, attempts: 5, maxDelay: 300 }).total, 750, 'total 750 seconds with the cap');
eq(R({ interval: 5, rate: 2, attempts: 3, maxDelay: 0 }).rows.map(r => r.wait), [5, 10, 20], 'interval 5, rate 2, three attempts');
eq(R({ interval: 60, rate: 1, attempts: 8, maxDelay: 0 }).total, 480, 'rate 1 does not grow: 8 x 60 seconds');
eq(R({ interval: 30, rate: 1.5, attempts: 4, maxDelay: 0 }).rows.map(r => r.wait), [30, 45, 67.5, 101.25], 'rate 1.5');
eq(R({ interval: 30, rate: 3, attempts: 8, maxDelay: 300 }).rows.map(r => r.wait), [30, 90, 270, 300, 300, 300, 300, 300], 'rate 3 with a cap');
eq(R({ interval: 30, rate: 3, attempts: 8, maxDelay: 300 }).total, 1890, 'total 1,890 seconds');

// ---- the bill, worked out by hand --------------------------------------------------------------------------------------------
const B = W.billInfo, today = B.presets.today.v, line = (ls, k) => ls.find(l => l.k === k).cost;
const L0 = B.lines(today);
near(line(L0, 'storage'), 2000 * 0.023, 'storage: 2,000 GB at $0.023', 1e-9);
near(line(L0, 'requests'), 5000 * 0.005 + 50000 * 0.0004, 'requests: 5 million PUT and 50 million GET', 1e-9);
near(line(L0, 'athena'), 20 * 5, 'Athena: 20 TB at $5', 1e-9);
near(line(L0, 'glue'), 600 * 0.44, 'Glue: 600 DPU-hours at $0.44', 1e-9);
near(line(L0, 'kinesis'), 730 * 0.04 + 300 * 0.08 + 600 * 0.04, 'Kinesis: 730 hours, 300 GB in, 600 GB out', 1e-9);
near(line(L0, 'lambda'), 300000 * 0.0000166667 + 3 * 0.2, 'Lambda: 300,000 GB-seconds and 3 million requests', 1e-9);
near(line(L0, 'nat'), 730 * 0.045 + 500 * 0.045, 'NAT gateway: 730 hours and 500 GB', 1e-9);
near(line(L0, 'redshift'), 1000 * 0.375, 'Redshift Serverless: 1,000 RPU-hours at $0.375', 1e-9);
near(line(L0, 'logs'), 100 * 0.5, 'CloudWatch Logs: 100 GB at $0.50', 1e-9);
near(B.total(L0), 1018.15, 'the bill today is $1,018.15', 0.01);
near(line(B.lines(today, { parquet: true }), 'athena'), 10, 'Parquet and folders: Athena $100 becomes $10', 1e-9);
near(line(B.lines(today, { life: true }), 'storage'), 2000 * (0.3 * 0.023 + 0.7 * 0.0125), 'lifecycle: 30 percent stays at $0.023, 70 percent at $0.0125', 1e-9);
near(line(B.lines(today, { gateway: true }), 'nat'), 730 * 0.045 + 500 * 0.2 * 0.045, 'a gateway endpoint removes 80 percent of the NAT data', 1e-9);
near(line(B.lines(today, { flex: true }), 'glue'), 600 * 0.365, 'Flex for half of the hours', 1e-9);
near(line(B.lines(today, { arm: true }), 'lambda'), 300000 * 0.0000166667 * 0.8 + 0.6, 'Graviton: 20 percent off the duration part', 1e-9);
near(B.total(B.lines(today, { parquet: true, life: true, gateway: true, flex: true, arm: true })), 849.45, 'all five savings: $849.45', 0.01);
near(B.total(B.lines(B.presets.grown.v)), 460 + (50000 * 0.005 + 500000 * 0.0004) + 1000 + 2640 + (730 * 0.04 + 3000 * 0.08 + 6000 * 0.04) + (3000000 * 0.0000166667 + 30 * 0.2) + (730 * 0.045 + 5000 * 0.045) + 2250 + 500, 'the grown bill, line by line: $8,123.05', 0.01);

// ---- Redshift distribution and sort keys: a model, so the checks recompute it a second way -----------------------------------
const D = W.distkeyInfo;
// 400 customers, orders for customer k proportional to 1/k, scaled so that 8,000 is the target before rounding
let hn = 0; for (let k = 1; k <= 400; k++) hn += 1 / k;
near(hn, Math.log(400) + 0.5772156649 + 1 / 800, 'the harmonic number of 400', 1e-4);
eq(D.customers[0].n, Math.round(8000 / hn), 'the biggest customer places 8,000 / H(400) orders, rounded');
eq(D.customers[0].n, 1218, 'which is 1,218 orders by hand: 8,000 / 6.5699');
eq(D.customers[399].n, 3, 'the smallest customer places 3 orders');
eq(D.customers.reduce((a, x) => a + x.n, 0), D.total, 'the customers add up to the table size');
eq(D.total, 7994, 'the table holds 7,994 orders after rounding');
// FNV-1a 32 bit again, with BigInt, for the same strings
function fnvBig(s) { let h = 0x811c9dc5n; for (const ch of Buffer.from(s, 'latin1')) { h ^= BigInt(ch); h = (h * 0x01000193n) & 0xffffffffn; } return Number(h); }
['C-0001', 'C-0400', 'O-00001', 'O-07994'].forEach(s => eq(D.fnv(s), fnvBig(s), 'the hash of ' + s + ' matches a BigInt version'));
eq(D.fnv('a'), 0xe40c292c, 'FNV-1a of "a" is the published test value e40c292c');
// EVEN: round robin gives each of the 8 slices 7,994 / 8 = 999.25 rows, so 1,000 or 999
const evenRows = D.place('even');
eq(evenRows.reduce((a, x) => a + x, 0), 7994, 'EVEN keeps every row');
eq(evenRows.filter(x => x === 1000).length, 2, 'EVEN: 7,994 = 8 x 999 + 2, so two slices hold 1,000');
eq(evenRows.filter(x => x === 999).length, 6, 'EVEN: and six slices hold 999');
// KEY (customer_id): rebuild the placement with the BigInt hash
const keyRows = new Array(8).fill(0); D.customers.forEach(x => { keyRows[fnvBig(x.id) % 8] += x.n; });
eq(D.place('key_customer'), keyRows, 'KEY (customer_id) places each customer on the slice of its hash');
eq(keyRows.reduce((a, x) => a + x, 0), 7994, 'KEY (customer_id) keeps every row');
near(Math.max(...keyRows) / (7994 / 8), 1.9, 'KEY (customer_id): the busiest slice is 1.9 times the average', 0.01);
eq(keyRows[fnvBig('C-0001') % 8] >= 1218, true, 'the slice of the biggest customer holds at least his 1,218 orders');
const orderRows = new Array(8).fill(0); for (let k = 1; k <= 7994; k++) orderRows[fnvBig('O-' + String(k).padStart(5, '0')) % 8]++;
eq(D.place('key_order'), orderRows, 'KEY (order_id) places each order on the slice of its hash');
eq(Math.max(...orderRows) / (7994 / 8) < 1.01, true, 'KEY (order_id) is within 1 percent of even');
// the join step: labels worked out by hand from the documented rules, for 400 and for 40,000 customers
const want = {
  400: { even: { even: ['DS_BCAST_INNER', 1600], key_customer: ['DS_BCAST_INNER', 1600], all: ['DS_DIST_ALL_NONE', 0] },
         key_customer: { even: ['DS_DIST_INNER', 400], key_customer: ['DS_DIST_NONE', 0], all: ['DS_DIST_ALL_NONE', 0] },
         key_order: { even: ['DS_BCAST_INNER', 1600], key_customer: ['DS_BCAST_INNER', 1600], all: ['DS_DIST_ALL_NONE', 0] } },
  40000: { even: { even: ['DS_DIST_BOTH', 7994 + 40000], key_customer: ['DS_DIST_OUTER', 7994], all: ['DS_DIST_ALL_NONE', 0] },
           key_customer: { even: ['DS_DIST_INNER', 40000], key_customer: ['DS_DIST_NONE', 0], all: ['DS_DIST_ALL_NONE', 0] },
           key_order: { even: ['DS_DIST_BOTH', 7994 + 40000], key_customer: ['DS_DIST_OUTER', 7994], all: ['DS_DIST_ALL_NONE', 0] } }
};
Object.keys(want).forEach(cn => Object.keys(want[cn]).forEach(o => Object.keys(want[cn][o]).forEach(cs => {
  const p = D.plan(o, cs, +cn);
  eq([p.label, p.moved], want[cn][o][cs], 'join of orders ' + o + ' with ' + cn + ' customers ' + cs);
})));
eq(D.plan('even', 'even', 400).other.label, 'DS_DIST_BOTH', 'the option that lost for two EVEN tables is a double redistribution');
eq(D.plan('even', 'even', 400).other.moved, 7994 + 400, 'and it would move 8,394 rows');
// the sort key: 100 blocks, 1 day of 90, 31 days of 90, 1 customer of 400
const qq = k => D.queries.find(x => x.k === k);
eq(D.blocks('order_date', qq('day')), Math.ceil(100 / 90), 'one day: 2 blocks');
eq(D.blocks('order_date', qq('month')), Math.ceil(100 * 31 / 90), 'a month: 35 blocks');
eq(D.blocks('customer_id', qq('customer')), 1, 'one customer sorted by customer: 1 block');
eq(D.blocks('none', qq('day')), 100, 'no sort key: every block');
eq(D.blocks('customer_id', qq('day')), 100, 'the wrong sort key: every block');

console.log(checks + ' checks, ' + (fails ? fails + ' failed' : 'all passed'));
process.exit(fails ? 1 : 0);
