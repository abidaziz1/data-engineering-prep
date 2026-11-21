// Checks the recorded numbers that the Scala labs and lessons read, with rules written here, in code that shares nothing with the widgets: the five lines of the parser worked out
// again from the rules of the parser, the totals of the sales lines, how many steps a strict list and a view must take, the 1,000 orders of the Spark session counted from the rule
// that made them, and the Scala versions of the three builds.
// The widgets themselves are driven in a browser by scala/verify/e2e_labs.js.
// Run: node scala/verify/check_widgets.js        SCALA_REAL_JS=<file> lets verify_scala.py feed it a changed copy of the recording
const fs = require('fs'), path = require('path');
global.window = global; global.LAB = {};
const root = path.join(__dirname, '..', '..');
(0, eval)(fs.readFileSync(process.env.SCALA_REAL_JS || path.join(root, 'scala', 'js', 'real.js'), 'utf8'));
const R = LAB.real, C = k => R.counts[k], X = k => R.text[k], lines = k => X(k).split('\n');
let checks = 0, fails = 0;
const eq = (got, want, what) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) { fails++; console.log('FAIL:', what, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };
const yes = (cond, what) => { checks++; if (!cond) { fails++; console.log('FAIL:', what); } };
const sorted = o => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
const dict = text => sorted(Object.fromEntries(/\((.*)\)$/.exec(text)[1].split(', ').map(p => p.split(' -> ')).map(([k, v]) => [k, +v])));

// ---- the parser of mission 4, worked out again from its rules -------------------------------------------------------------------------------------------------------
const parseCents = a => { if (!/^-?\d+(\.\d+)?$/.test(a)) return { l: "not a number: '" + a + "'" }; const dec = (a.split('.')[1] || '').length; if (dec > 2) return { l: "more than two decimals: '" + a + "'" }; const [w, f = ''] = a.split('.'); return { r: +w * 100 + +(f + '00').slice(0, 2) }; };
const parse = line => { const f = line.split(','); if (f.length !== 3) return { l: 'expected 3 fields but got ' + f.length + ": '" + line + "'" }; if (!/^-?\d+$/.test(f[1])) return { l: "bad store id: '" + f[1] + "'" }; const c = parseCents(f[2]); return c.l ? { l: c.l } : { r: 'Order(' + f[0] + ',' + f[1] + ',' + c.r + ')', cents: c.r }; };
const INPUT = ['O-1,1,12.50', 'O-2,x,3.00', 'O-3,2,4.505', 'O-4,2', 'O-5,2,7'];
const E = lines('err.errors');
eq(E.slice(0, 2), ['scalac Errors.scala', 'java -cp out:scala-library.jar Errors'], 'the replay of the parser starts with its two commands');
eq(E.slice(2, 7), INPUT.map(l => { const p = parse(l); return p.l ? 'Left(' + p.l + ')' : 'Right(' + p.r + ')'; }), 'each of the five lines gives the Right or the Left that the rules of the parser give');
const good = INPUT.map(parse).filter(p => p.r), bad = INPUT.map(parse).filter(p => p.l);
eq([C('err').good, C('err').bad, C('err').cents, C('err').summary], [good.length, bad.length, good.reduce((a, p) => a + p.cents, 0), good.length + ' good, ' + bad.length + ' bad, ' + good.reduce((a, p) => a + p.cents, 0) + ' cents'], 'two good lines, three bad lines, and their cents');
eq([C('err').none_get, C('err').number_format], ['None.get', 'java.lang.NumberFormatException: For input string: "12x"'], 'Option.get on None and Int parsing of 12x');
eq([E[10], E[11], E[12]], ['Some(a)', 'None', '43'], 'orElse, a for over a None, and a Try that adds 1 to 42');

// ---- the collections of mission 3 --------------------------------------------------------------------------------------------------------------------------------------
const L = [['MUG', 1, 900], ['BEANS-250', 2, 1800], ['BEANS-250', 5, 1800], ['FILTER', 5, 350]];
const grouped = {}; L.forEach(([s, q]) => { grouped[s] = (grouped[s] || 0) + q; });
const last = {}; L.forEach(([s, q]) => { last[s] = q; });
const K = C('coll'), CL = lines('coll.collections').slice(2);
eq(CL[0], 'List(' + L.map(l => l[0]).join(', ') + ')', 'map to the SKUs');
eq(dict(CL[1]), sorted(grouped), 'groupMapReduce adds the quantities of a SKU');
eq(CL[2], String(L.reduce((a, [, q, c]) => a + q * c, 0)), 'foldLeft: quantity times cents, added up');
eq(dict(CL[3]), sorted(last), 'toMap keeps the last quantity of a key');
yes(last['BEANS-250'] === 5 && grouped['BEANS-250'] === 7, 'the two disagree for BEANS-250: 5 and 7');
eq(K.duplicate_key_line, CL[3], 'the count of the duplicate-key line');
let strict = 0, seen = []; const xs = [1, 2, 3, 4];
const mapped = xs.map(x => { strict++; return x * 10; }); const filtered = mapped.filter(x => { strict++; return x % 20 === 0; });
let lazySteps = 0; const trace = []; let firstLazy = null;
for (const x of xs) { lazySteps++; trace.push('map ' + x); const m = x * 10; lazySteps++; trace.push('filter ' + m); if (m % 20 === 0) { firstLazy = m; break; } }
eq([K.strict_steps, K.lazy_steps, K.lazy_trace, filtered[0], firstLazy], [strict, lazySteps, trace.join(', '), 20, 20], 'a strict list does 4 maps and 4 filters, a view stops at the first match after 4 steps');
eq(CL[6], 'stock("TEA"): key not found: TEA', 'apply on a missing key');
eq(CL[8], 'head: head of empty list', 'head of an empty list');
eq(CL[9], '(List(1, 2, 3, 4, 5),List(1, 2, 3, 4))', 'appending makes a new list and leaves the old one');
eq(CL[12], 'List(BEANS-250, BEANS-250, FILTER)', 'the for comprehension keeps the lines with a quantity above 1');

// ---- the Spark session of mission 5, counted from the rule that made the orders -----------------------------------------------------------------------------
const orders = []; for (let i = 1; i <= 1000; i++) orders.push({ id: 'O-' + i, store: 1 + i % 12, status: i % 10 === 0 ? 'REFUNDED' : 'PLACED', cents: 500 + i });
const S = C('spark'), SL = lines('spark.run');
eq(SL.slice(0, 2), ['spark-submit --master local[2] --class SparkApp app.jar', 'Spark ' + R.meta.spark + ' on Scala ' + R.meta.scala], 'the command and the banner of the session');
eq([S.orders, S.placed, S.fixed_count], [orders.length, orders.filter(o => o.status === 'PLACED').length, orders.filter(o => o.cents >= 600).length], 'orders, placed orders, and orders with 600 cents or more');
const byStore = {}; orders.forEach(o => { byStore[o.store] = (byStore[o.store] || 0) + 1; });
eq(S.by_store, [1, 2, 3].map(s => '(' + s + ',' + byStore[s] + ')').join(', '), 'the count of orders of stores 1, 2 and 3');
eq(SL[5], orders.filter(o => o.cents > 1400).map(o => o.id).sort().slice(0, 2).join(', '), 'the first two ids above 1400 cents, sorted as text');
eq([S.untyped_error, S.closure_headline, S.cause], ['UNRESOLVED_COLUMN.WITH_SUGGESTION', 'Task not serializable', 'java.io.NotSerializableException: Settings'], 'the three errors of the session');
yes(R.meta.spark === '4.0.1' && R.meta.scala === '2.13.16', 'Spark 4.0.1 is built with Scala 2.13.16');
const SE = C('spark.errors');
eq([SE.typed_message, SE.typed_hint, SE.encoder_message], ['value statu is not a member of Order', true, 'value toDS is not a member of Seq[Plain]'], 'the two compile errors');
eq([SE.typed_exit, SE.encoder_exit], [1, 1], 'both compile errors stop the compiler with exit code 1');
yes(/did you mean status\?/.test(X('spark.typed_error')) && /error: value toDS is not a member of Seq\[Plain\]/.test(X('spark.encoder_error')), 'the replays of the two compile errors show the messages');

// ---- the builds of mission 1 ------------------------------------------------------------------------------------------------------------------------------------------------
const H = C('build.hello'), B = C('build.binary'), NL = C('build.no_library'), BJ = C('build.jar'), CE = C('build.compile_error');
eq(H.output, 'Hello, Brewline from Scala ' + R.meta.scala + ' on Java ' + R.meta.java_feature, 'the greeting names the Scala and Java that ran');
eq([H.compile_exit, H.run_exit], [0, 0], 'the first program compiles and runs');
eq(dict(B.both212_output), { s1: 8, s2: 7 }, 'the 2.12 build adds s1 to 8 and s2 to 7');
eq(dict(B.both213_output), { s1: 8, s2: 7 }, 'the 2.13 build adds the same numbers');
yes(B.both212_output !== B.both213_output && /^HashMap\(/.test(B.both213_output) && /^Map\(/.test(B.both212_output), 'the two versions print the same map in another form');
yes(B.mixed_exit === 1 && B.mixed_compiled === true && /^java\.lang\.NoSuchMethodError: 'scala\.collection\.immutable\.Map Totals\$\.byStore\(scala\.collection\.immutable\.Seq\)'$/.test(B.mixed_error), 'the mixed build compiled and then failed on the method with the immutable Seq');
yes(/NoClassDefFoundError: scala\//.test(NL.error) && NL.exit === 1 && BJ.jar_run_exit === 1 && /NoClassDefFoundError: scala\//.test(BJ.jar_run_error) && BJ.with_library_exit === 0 && BJ.with_library_output === H.output, 'without the library the program fails, and with it the same jar prints the greeting');
yes(CE.exit_code === 1 && CE.class_file_made === false && /found   : String\("12"\)/.test(X('build.compile_error')) && /required: Int/.test(X('build.compile_error')), 'a String where an Int belongs stops the compiler and makes no class file');
yes(/Scala compiler version 2\.13\.16/.test(X('tool.versions')) && /built with Scala 2\.13\.16/.test(X('tool.versions')), 'the versions replay names the compiler and the Scala of Spark');

// ---- the language of mission 2 -----------------------------------------------------------------------------------------------------------------------------------------
const O = lines('lang.orders').slice(2), P = C('lang');
eq(O.slice(0, 7), ['Order(O-1,1,Placed,1250)', 'true', 'false', 'Order(O-1,1,Shipped,1250)', 'delivered', 'O-1 in store 1: 1250 cents', 'bad order: requirement failed: cents must not be negative: -5'], 'the case class prints, compares, copies, matches, takes apart and refuses a negative amount');
eq(O[8], '2 lines in the text block', 'the text block has two lines');
eq([P.warning, P.missing_input, P.match_error, P.exit], [true, 'Refunded', 'Refunded (of class Refunded$)', 1], 'the partial match warns for Refunded and fails with a MatchError');
yes(/warning: match may not be exhaustive\./.test(X('lang.partial')) && /It would fail on the following input: Refunded/.test(X('lang.partial')) && /^1 warning$/m.test(X('lang.partial')), 'the replay of the partial match holds the warning and counts one');

// ---- the coding round, worked out in integer cents --------------------------------------------------------------------------------------------------------------------
const sample = [[2, '12.50'], [1, '5.00'], [2, '3.25'], [1, '0.99'], [3, '100'], [2, '7.10']], tot = {};
sample.forEach(([s, a]) => { tot[s] = (tot[s] || 0) + parseCents(a).r; });
const CH = C('challenge'), badLines = ['O-7,x,PLACED,1.00', 'O-8,1,PLACED,12.505'];
eq(CH.good_output, 'Right(TreeMap(' + Object.keys(tot).sort((a, b) => a - b).map(k => k + ' -> ' + tot[k]).join(', ') + '))', 'cents by store, sorted by store id');
eq(CH.bad_output, 'Left(List(line ' + (2 + sample.length) + ": bad store id: 'x', line " + (3 + sample.length) + ": more than two decimals: '12.505'))", 'each bad line is named by its number, counting the header as line 1');
eq(lines('challenge.run').slice(2), [CH.good_output, CH.bad_output], 'the replay of the coding round');

console.log(fails ? fails + ' of ' + checks + ' checks FAILED' : checks + ' checks passed');
process.exit(fails ? 1 : 0);
