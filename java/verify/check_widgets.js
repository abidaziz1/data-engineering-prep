// Checks the recorded numbers that the Java labs and lessons read, with rules written here, in code that shares nothing with the widgets: the money and the size of the two
// files worked out again from the rules that made them, a million additions of 0.10, the rounding of two prices, how DST moves a clock in New York, what the JDBC program must
// have printed, the arithmetic of the race, the pool and the coding round, and how the heap limits and the exit codes must agree with each other.
// The widgets themselves are driven in a browser by java/verify/e2e_labs.js.
// Run: node java/verify/check_widgets.js        JAVA_REAL_JS=<file> lets verify_java.py feed it a changed copy of the recording
const fs = require('fs'), path = require('path');
global.window = global; global.LAB = {};
const root = path.join(__dirname, '..', '..');
(0, eval)(fs.readFileSync(process.env.JAVA_REAL_JS || path.join(root, 'java', 'js', 'real.js'), 'utf8'));
const R = LAB.real, C = k => R.counts[k], X = k => R.text[k];
let checks = 0, fails = 0;
const eq = (got, want, what) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) { fails++; console.log('FAIL:', what, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };
const yes = (cond, what) => { checks++; if (!cond) { fails++; console.log('FAIL:', what); } };
const pad = (v, w) => String(v).padStart(w, '0');

// ---- the data, worked out again from the rules that made it ------------------------------------------------------------------------------------------------
const cents = i => (5 + (i * 17) % 80) * 100 + (i * 5) % 100;
let c50 = 0; for (let i = 1; i <= 50; i++) c50 += cents(i);
eq([C('maven.run').cents_expected, C('maven.run').expected_output, C('maven.run').shaded_output], [c50, '50 orders, ' + c50 + ' cents', '50 orders, ' + c50 + ' cents'], 'the 50-order file adds up to the cents that the shaded jar printed');
let c1m = 0, bytes = Buffer.byteLength('order_id,store_id,customer_id,order_ts,status,amount\n');
for (let i = 1; i <= 1000000; i++) {
  const c = cents(i); c1m += c;
  bytes += Buffer.byteLength('O-' + pad(i, 7) + ',' + (1 + (i * 7) % 12) + ',C-' + pad(1 + (i * 13) % 400, 3) + ',2026-03-' + pad(1 + i % 28, 2) + ' ' + pad(i % 24, 2) + ':' + pad((i * 11) % 60, 2) + ':00,' + (i % 25 === 0 ? 'REFUNDED' : 'PLACED') + ',' + Math.floor(c / 100) + '.' + pad(c % 100, 2) + '\n');
}
const M = C('mem');
eq([M.sum_expected, M.sum_output, M.lines], ['1000000 rows, ' + c1m + ' cents', '1000000 rows, ' + c1m + ' cents', 1000001], 'the file of a million orders adds up to the cents that the 32 MB reader printed, and has a million and one lines');
eq(M.file_mb, Math.round(bytes / 1048576 * 10) / 10, 'the size of the file, worked out from the length of its lines');

// ---- the heap limits and what ran in them ------------------------------------------------------------------------------------------------------------------
eq([M.max_heap_64, M.max_heap_32], ['max heap: 64 MB', 'max heap: 32 MB'], 'the JVM reports the heap limit that the command line set');
eq([M.oom_exit, M.stream_exit, M.sum_exit], [1, 0, 0], 'the exit codes: the list failed, the stream and the sum worked');
eq(M.oom_message, 'java.lang.OutOfMemoryError: Java heap space', 'the error is a heap error');
eq([M.stream_output, M.all_2g_output], ['1000001 lines counted from a stream', '1000001 lines read into a list'], 'the stream counted a million and one lines, and the list at 2 GB held them');
yes(M.file_mb < 64, 'the file is smaller than the heap that could not hold it as a list');
const mt = X('mem.stream').split('\n'), cmds = mt.filter(l => /^java /.test(l)), heaps = cmds.map(l => /-Xmx(\d+)([mg])/.exec(l)).map(m => +m[1] * (m[2] === 'g' ? 1024 : 1));
eq(heaps, [64, 32, 2048], 'the three commands of the replay use heaps of 64 MB, 32 MB and 2 GB');
eq(mt.filter(l => /^max heap: /.test(l)).map(l => +/(\d+) MB/.exec(l)[1]), heaps, 'the heap that each run printed is the heap of its command');
yes(/^java -Xmx64m Memory\.java all /.test(X('mem.oom')) && /OutOfMemoryError: Java heap space/.test(X('mem.oom')), 'the replay of the failure shows the command and the error');
yes(C('tool.gc').max_heap_mb > 0 && typeof C('tool.gc').g1_is_default === 'boolean', 'the default heap and the collector were read from the JVM');

// ---- numbers ----------------------------------------------------------------------------------------------------------------------------------------------------
let d = 0; for (let i = 0; i < 1000000; i++) d += 0.10;
const NS = C('num.sums'), L = X('num.numbers').split('\n');
eq([NS.first, NS.double_sum, NS.bigdecimal_sum, NS.iterations], [String(0.1 + 0.2), String(d), '100000.00', 1000000], 'the sums of the lab: 0.1 + 0.2, and a million additions of 0.10 in a double, repeated here in JavaScript, which has the same doubles');
eq(L[0], 'java Numbers.java', 'the replay starts with its command');
eq(L[2], 'double sum:     ' + String(d), 'the line of the double sum');
eq(L[3], 'BigDecimal sum: 100000.00', 'the line of the BigDecimal sum');
eq(L[4], '0.1000000000000000055511151231257827021181583404541015625', 'new BigDecimal(0.1) is the exact value of the double 0.1 (the first 55 digits of 2^-4 times 1.6)');
eq(L[5], String(((2 ** 31 - 1) + 1) | 0), 'Integer.MAX_VALUE + 1 wraps to the smallest int');
eq(L[6], 'addExact: integer overflow', 'addExact throws');
eq(L[8].startsWith('divide: Non-terminating decimal expansion'), true, 'ten divided by three with no scale throws');
eq(L[9], (10 / 3).toFixed(2), '10 / 3 with two decimals');
// HALF_EVEN on the exact decimals 2.345 and 2.355: a tie goes to the even last digit
const halfEven = (cents1000) => { const q = Math.floor(cents1000 / 10), r = cents1000 % 10; return r > 5 || (r === 5 && q % 2 === 1) ? q + 1 : q; };
eq(L[10], [halfEven(2345), halfEven(2355)].map(v => (v / 100).toFixed(2)).join(' '), 'HALF_EVEN rounds 2.345 to 2.34 and 2.355 to 2.36');
eq(L[11], (3 * 1999) + ' cents', 'three items at 19.99 are 5997 cents');
eq(L.length, 12, 'the replay has its command and eleven lines');

// ---- time, worked out with the time zone database of this machine ----------------------------------------------------------------------------------------------------
const nyParts = (iso) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso)).reduce((o, p) => (o[p.type] = p.value, o), {});
const sunday = (y, m, nth) => { let day = 1, n = 0; for (; ; day++) { if (new Date(Date.UTC(y, m - 1, day)).getUTCDay() === 0 && ++n === nth) return day; } };
eq([sunday(2026, 3, 2), sunday(2026, 11, 1)], [8, 1], 'US clocks change on the second Sunday of March and the first of November: 8 March and 1 November 2026');
const tm = X('num.times').split('\n');
yes(tm[1].startsWith('2026-03-08T03:30-04:00[America/New_York]'), '02:30 on 8 March does not exist in New York and moves to 03:30 at -04:00');
yes(tm[2] === '2026-11-01T01:30-04:00[America/New_York] and 2026-11-01T01:30-05:00[America/New_York]', '01:30 on 1 November happens twice, at -04:00 and at -05:00');
const hrs = (new Date('2026-03-08T12:00:00-04:00') - new Date('2026-03-07T12:00:00-05:00')) / 3600000;
yes(tm[3] === '2026-03-08T12:00-04:00[America/New_York] ' + hrs + ' hours, 1 day', 'noon to noon across the change is ' + hrs + ' hours and one day');
const ny = nyParts('2026-03-14T09:12:00Z');
yes(tm[4] === ny.year + '-' + ny.month + '-' + ny.day + 'T' + ny.hour + ':' + ny.minute, 'the instant 09:12 UTC on 14 March is ' + ny.hour + ':' + ny.minute + ' in New York');
yes(tm[5] === '2026-03-14T09:12', 'a local date and time parsed from a text keeps the text as it is');
yes(/2026-02-30/.test(tm[6]) && /FEBRUARY 30/.test(tm[6]) && /14\/03\/2026 09:12/.test(tm[7]), 'the two parse errors name the text that was refused');

// ---- JDBC: what the program must print, worked out from the rules of its rows ---------------------------------------------------------------------------------------
const J = X('jdbc.run').split('\n');
let store1 = 0; for (let i = 1; i <= 1000; i++) if (1 + i % 12 === 1) store1++;
eq(J[0], 'java -cp libs/h2-2.3.232.jar Jdbc.java', 'the replay starts with its command');
eq(J[1], 'rows after ' + (1000 / 250) + ' batches: 1000', 'a thousand rows in batches of 250: four batches');
eq(J[2], 'glued into the text: 1000 rows, bound as a parameter: 0 rows', 'a glued OR condition matches every row, a bound parameter matches none');
eq(J[3], 'inside the transaction: ' + (1000 - store1), 'the delete of store 1 removed ' + store1 + ' of the thousand rows: store 1 is every twelfth order');
eq(J[4], 'after the rollback: 1000', 'a rollback brings back every row');
yes(/^duplicate key: SQLState 23\d\d\d$/.test(J[5]) && J.length === 6, 'a duplicate key is a class 23 SQLState (an integrity constraint), and the replay ends there');

// ---- threads and serialization --------------------------------------------------------------------------------------------------------------------------------------------
const K = C('conc'), RC = X('conc.race').split('\n');
let sq = 0; for (let k = 1; k <= 10; k++) sq += k * k;
eq([K.runs, K.plain_short_in_runs.length, K.atomic_exact_in_runs.length], [3, 3, 3], 'three runs, with a verdict on each');
yes(K.atomic_exact_in_runs.every(Boolean), 'the atomic counter was exact in every run');
yes(K.plain_short_in_runs.some(Boolean), 'the plain counter lost an update in at least one run (a counter can never be above the exact total)');
eq([K.pool_sum, K.virtual_finished, K.is_virtual], [sq, 1000, true], 'the squares of 1 to 10 add up to 385, a thousand virtual tasks finished, and a virtual thread says so');
yes(K.cpus >= 1 && Number.isInteger(K.cpus), 'the number of CPUs is a whole number');
yes(/^expected 800000, plain int (short|exact), AtomicInteger 800000$/.test(RC[1]) && RC[2] === 'sum of squares from a pool of 4: ' + sq && RC[3] === 'virtual threads that finished: 1000' && RC[4] === 'is virtual: true', 'the lines of the race replay');
yes(8 * 100000 === 800000, 'eight threads of a hundred thousand additions make 800,000');
eq(X('conc.ser').split('\n'), ['java Ser.java', 'failed: java.io.NotSerializableException: Ser$Connection', 'transient field: serialized fine'], 'the serialization replay');

// ---- the coding round, worked out in cents with integers ------------------------------------------------------------------------------------------------------------------------
const sample = [[2, '12.50'], [1, '5.00'], [2, '3.25'], [1, '0.99'], [3, '100'], [2, '7.10']], by = {};
for (const [s, a] of sample) { const [w, f = ''] = a.split('.'); by[s] = (by[s] || 0) + (+w) * 100 + +(f + '00').slice(0, 2); }
const H = C('challenge');
eq([H.output, H.expected, H.stores], ['{' + Object.keys(by).sort((p, q) => p - q).map(k => k + '=' + by[k]).join(', ') + '}', '{1=599, 2=2285, 3=10000}', 3], 'cents by store, sorted by store id');
eq(H.refused, 'refused: Rounding necessary', 'a third decimal is refused, not rounded');
eq(X('challenge.run').split('\n'), ['java Challenge.java', H.output, H.refused], 'the replay of the coding round');

// ---- build, classpath, Maven --------------------------------------------------------------------------------------------------------------------------------------------------
const CP = C('build.classpath'), BC = C('build.compile_error'), BJ = C('build.javap'), MP = C('maven.package'), MV = C('maven.run'), MT = C('maven.tree'), CF = C('maven.conflict'), FX = C('maven.conflict_fixed'), FT = C('maven.failing_test');
eq([CP.without_exit, CP.with_exit, CP.with_output, CP.error_names_the_class], [1, 0, pad(42, 6), true], 'without the library the program fails, with it it prints 000042');
yes(/NoClassDefFoundError: org\/apache\/commons\/lang3\/StringUtils/.test(X('build.classpath')), 'the error names the missing class');
eq([BC.exit_code, BC.class_file_made], [1, false], 'a type error stops javac and no class file is made');
yes(/incompatible types: String cannot be converted to int/.test(X('build.compile_error')) && /^1 error$/m.test(X('build.compile_error')), 'the compile error says what it found');
yes(BJ.has_iadd && BJ.has_ireturn && /iadd/.test(X('build.javap')) && /ireturn/.test(X('build.javap')), 'the bytecode of add holds iadd and ireturn');
eq([MP.exit, MP.tests_run, MP.build_success, MP.shaded, MP.original_jar_kept, MP.jar_made], [0, 2, true, true, true, true], 'the Maven build ran two tests, shaded the jar and kept the original');
eq([MV.shaded_exit, MV.thin_exit, MV.thin_cp_exit, MV.shaded_bigger_than_thin], [0, 1, 1, true], 'the shaded jar runs, the thin jar does not');
yes(/no main manifest attribute/.test(MV.thin_error) && /NoClassDefFoundError: org\/apache\/commons\/csv\/CSVFormat/.test(MV.thin_cp_error), 'the thin jar has no main class, and on the classpath it lacks the CSV library');
const tl = X('maven.tree').split('\n').slice(1);
eq([MT.lines, MT.direct, MT.has_junit_test_scope], [tl.length, tl.filter(l => /^(\+- |\\- )/.test(l)).length, tl.some(l => /junit-jupiter/.test(l) && /:test$/.test(l))], 'the tree: its lines, its three direct libraries, and a test scope for JUnit');
eq(MT.direct, 3, 'three direct libraries');
eq([CF.exit, CF.chosen_io_version, CF.wanted_io_version, CF.omitted_for_conflict_lines, FX.exit, FX.output], [1, '2.4', '2.16.1', 1, 0, 'O-1 5.00'], 'a pin of 2.4 won over the 2.16.1 that commons-csv wanted, and a newer pin fixed it');
yes(/omitted for conflict with 2\.4/.test(X('maven.conflict_tree')) && /NoClassDefFoundError: org\/apache\/commons\/io\/output\/AppendableOutputStream/.test(CF.error), 'the verbose tree shows the omitted version, and the error names the missing class');
eq([FT.exit, FT.build_failure, FT.message_has_expected], [1, true, true], 'a wrong expectation fails the build');
yes(/expected: <1251> but was: <1250>/.test(X('maven.failing_test')), 'the failing test says what it expected and what it got');

// ---- the language -----------------------------------------------------------------------------------------------------------------------------------------------------------------------
const O = X('lang.orders').split('\n'), S = X('lang.streams').split('\n');
yes(O[1] === 'Order[id=O-1, storeId=1, status=PLACED, amount=12.5]' && O[6] === 'add failed: java.lang.UnsupportedOperationException' && /amount must not be negative/.test(O[7]), 'a record prints its components, an immutable list refuses add, and the compact constructor refuses a negative amount');
yes(S[2] === 'peek a' && S[3] === 'got A' && S[4] === 'peek b' && S[5] === 'got B' && !S.some(l => l === 'peek c'), 'a lazy stream takes one element through the whole pipeline at a time, and limit(2) never reads the third');
yes(/stream has already been operated upon or closed/.test(S[6]) && /Duplicate key BEANS-250/.test(S[7]), 'a stream cannot be reused, and toMap refuses a duplicate key');
eq([C('lang').orders_lines, C('lang').streams_lines], [O.length - 1, S.length - 1], 'the number of output lines of the two programs');

console.log(fails ? fails + ' of ' + checks + ' checks FAILED' : checks + ' checks passed');
process.exit(fails ? 1 : 0);
